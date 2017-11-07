import PropTypes from 'prop-types';
import SvgComponent from '../SvgComponent';

export const ANNOTATION_HEIGHT = 8;
export const LABEL_SIZE = ANNOTATION_HEIGHT * 1.5;

const ARROW_WIDTH = 5;
const ARROW_SEPARATION = 10;
const COLOR = "blue";
const IN_EXON_ARROW_COLOR = "white";

const LABEL_BACKGROUND_PADDING = 2;

/**
 * A single annotation for the gene annotation track.
 * 
 * @author Silas Hsu
 */
export class GeneAnnotation extends SvgComponent {
    static propTypes = {
        gene: PropTypes.object.isRequired, // Gene to display
        isLabeled: PropTypes.bool.isRequired, // Whether to display the gene's name
        topY: PropTypes.number.isRequired, // The y coordinate of the top edge of the annotation

        /**
         * Called when this annotation is clicked.  Has the signature
         *     (event: React.SyntheticEvent, gene: Gene): void
         *         `event`: the mouse event from the click
         *         `gene`: the Gene object that was clicked, same as this.props.gene
         */
        onClick: PropTypes.func,
    };

    /**
     * Called when the annotation is clicked; executes the onClick callback provided via props.
     * 
     * @param {MouseEvent} event - MouseEvent from clicking this annotation
     */
    onClick(event) {
        if (this.props.onClick) {
            this.props.onClick(event, this.props.gene);
            event.stopPropagation();
        }
    }

    /**
     * Binds event listeners.
     * 
     * @override
     */
    componentDidMount() {
        this.group.on("click", this.onClick.bind(this));
        this.group.on("mousedown", event => event.stopPropagation());
    }

    /**
     * Draws the annotation.
     * 
     * @override
     */
    render() {
        this.group.clear();
        let gene = this.props.gene;

        const startX = this.props.drawModel.baseToX(gene.absStart);
        const endX = this.props.drawModel.baseToX(gene.absEnd);
        const centerY = this.props.topY + ANNOTATION_HEIGHT / 2;
        const bottomY = this.props.topY + ANNOTATION_HEIGHT;

        // Box that covers the whole annotation to increase the click area
        let coveringBox = this.group.rect(endX - startX, ANNOTATION_HEIGHT).attr({
            x: startX,
            y: this.props.topY,
        });
        if (!this.props.isLabeled) { // Unlabeled: just fill the box and end there
            coveringBox.fill(COLOR);
            return null;
        } else {
            coveringBox.opacity(0);
        }

        // Center line
        this.group.line(startX, centerY, endX, centerY).stroke({
            color: COLOR,
            width: 2
        });

        // Exons
        // someComponent.clipWith(exonClip) will make it show up only where the exons are.
        let exonClip = this.group.clip();
        for (let exon of gene.absExons) {
            let exonStart = exon[0];
            let exonEnd = exon[1];
            let exonBox = this.group.rect(this.props.drawModel.basesToXWidth(exonEnd - exonStart), ANNOTATION_HEIGHT);
            exonBox.attr({
                x: this.props.drawModel.baseToX(exonStart),
                y: this.props.topY,
                fill: COLOR
            });
            exonClip.add(exonBox.clone());
        }

        // Arrows
        for (let x = startX; x <= endX; x += ARROW_SEPARATION) {
            let arrowTipX = gene.details.strand === "+" ?
                x - ARROW_WIDTH : // Point to the right
                x + ARROW_WIDTH; // Point to the left
            let arrowPoints = [
                [arrowTipX, this.props.topY],
                [x, centerY],
                [arrowTipX, bottomY]
            ]

            // Each arrow is duplicated, but the second set will only draw inside exons.
            this.group.polyline(arrowPoints).attr({
                fill: "none",
                stroke: COLOR,
                "stroke-width": 1
            });
            this.group.polyline(arrowPoints).attr({
                fill: "none",
                stroke: IN_EXON_ARROW_COLOR,
                "stroke-width": 1
            }).clipWith(exonClip); // <-- Note the .clipWith()
        }

        // Label
        let labelX, textAnchor;
        // Label width is approx. because calculating bounding boxes is expensive.
        let estimatedLabelWidth = gene.details.name2.length * ANNOTATION_HEIGHT;
        if (gene.isInView && startX - estimatedLabelWidth < 0) { // It's going to go off the screen; we need to move the label
            labelX = 0;
            textAnchor = "start";
            // Add highlighting, as the label will overlap the other stuff
            this.group.rect(estimatedLabelWidth + LABEL_BACKGROUND_PADDING * 2, ANNOTATION_HEIGHT).attr({
                x: -LABEL_BACKGROUND_PADDING,
                y: this.props.topY,
                fill: "white",
                opacity: 0.65,
            });
        } else {
            labelX = (gene.details.strand === "+" ? startX - ARROW_WIDTH : startX) - 5;
            textAnchor = "end";
        }
        this.group.text(gene.details.name2).attr({
            x: labelX,
            y: this.props.topY - ANNOTATION_HEIGHT,
            "text-anchor": textAnchor,
            "font-size": LABEL_SIZE,
        });

        return null;
    }
}

export default GeneAnnotation;
