import React from "react";
import memoizeOne from "memoize-one";

import { withTrackLegendWidth } from "../withTrackLegendWidth";

import { TrackModel } from "../../model/TrackModel";
import DisplayedRegionModel from "../../model/DisplayedRegionModel";
import { ViewExpansion, RegionExpander } from "../../model/RegionExpander";
// import { GuaranteeMap } from '../../model/GuaranteeMap';
import { MultiAlignmentViewCalculator, MultiAlignment } from "../../model/alignment/MultiAlignmentViewCalculator";
import { GenomeConfig } from "../../model/genomes/GenomeConfig";

interface DataManagerProps {
    genome: string; // The primary genome
    tracks: TrackModel[]; // Tracks
    viewRegion: DisplayedRegionModel; // Region that the user requests to view
    legendWidth: number;
    containerWidth: number;
    expansionAmount: RegionExpander;
    genomeConfig: GenomeConfig;
}

interface DataManagerState {
    primaryView: ViewExpansion;
}

interface WrappedComponentProps {
    alignments: Promise<MultiAlignment>;
    // alignments: AlignmentPromises;
    basesPerPixel: number;
    primaryViewPromise: Promise<ViewExpansion>;
    primaryView: ViewExpansion;
}

export function withTrackView(WrappedComponent: React.ComponentType<WrappedComponentProps>) {
    class TrackViewManager extends React.Component<DataManagerProps, DataManagerState> {
        private _primaryGenome: string;
        private _primaryGenomeConfig: GenomeConfig;
        private _multiAlignmentCalculator: MultiAlignmentViewCalculator;
        _isMounted = false;

        constructor(props: DataManagerProps) {
            super(props);
            this._primaryGenome = props.genome;
            this._primaryGenomeConfig = props.genomeConfig;
            // const queryGenomes = this.getSecondaryGenomes(props.tracks);
            // this._multiAlignmentCalculator = new MultiAlignmentViewCalculator(this._primaryGenome, queryGenomes);
            this._multiAlignmentCalculator = new MultiAlignmentViewCalculator(this._primaryGenomeConfig, props.tracks.filter(track => (track.type === 'genomealign' || track.filetype === 'genomealign')));
            this.state = {
                primaryView: props.expansionAmount.calculateExpansion(props.viewRegion, this.getVisualizationWidth()),
            };
            this.fetchPrimaryView = memoizeOne(this.fetchPrimaryView);
        }

        componentDidMount() {
            this._isMounted = true;
        }

        getVisualizationWidth() {
            if (this.props.tracks.length === 1 && this.props.tracks[0].type === "g3d") {
                return Math.max(100, this.props.containerWidth);
            } else {
                return Math.max(100, this.props.containerWidth - this.props.legendWidth);
            }
        }

        getSecondaryGenomes(tracks: TrackModel[]) {
            const genomeSet = new Set(tracks.map((track) => track.querygenome || track.getMetadata("genome")));
            genomeSet.delete(this._primaryGenome);
            genomeSet.delete(undefined);
            return Array.from(genomeSet);
        }

        async fetchPrimaryView(
            viewRegion: DisplayedRegionModel,
            tracks: TrackModel[],
            visWidth: number
        ): Promise<ViewExpansion> {
            console.log(visWidth)
            const visData = this.props.expansionAmount.calculateExpansion(viewRegion, visWidth);
            const secondaryGenomes = this.getSecondaryGenomes(tracks);
            if (!secondaryGenomes) {
                return visData;
            }
            try {
                const alignment = await this._multiAlignmentCalculator.multiAlign(visData);

                // All the primaryVisData in alignment should be the same:
                const [alignmentData] = Object.entries(alignment) // alignmentData is an array [queygenome string, alignment data]
                const primaryVisData = alignmentData.length ? alignmentData[1].primaryVisData : visData;
                if (this._isMounted) {
                    this.setState({ primaryView: primaryVisData });
                }
                return primaryVisData;
            } catch (error) {
                console.error(error);
                console.error("Falling back to nonaligned primary view");
                if (this._isMounted) {
                    this.setState({ primaryView: visData });
                }
                return visData;
            }
        }

        fetchAlignments(viewRegion: DisplayedRegionModel, visWidth: number): Promise<MultiAlignment> {
            const visData = this.props.expansionAmount.calculateExpansion(viewRegion, visWidth);
            // const queryGenomes = this.getSecondaryGenomes(this.props.tracks);
            const fetchedAlignment = this._multiAlignmentCalculator.multiAlign(visData);
            return fetchedAlignment;
        }

        async componentDidUpdate(prevProps: DataManagerProps) {
            if (
                this.props.viewRegion !== prevProps.viewRegion ||
                this.props.tracks !== prevProps.tracks ||
                this.props.containerWidth !== prevProps.containerWidth
            ) {
                const primaryView = await this.fetchPrimaryView(
                    this.props.viewRegion,
                    this.props.tracks,
                    this.getVisualizationWidth()
                );
                if (this._isMounted) {
                    // console.log("from update");
                    this.setState({ primaryView });
                }
            }
            if (prevProps.genomeConfig !== this.props.genomeConfig) {
                this._primaryGenome = this.props.genome;
                this._primaryGenomeConfig = this.props.genomeConfig;
            }
        }

        componentWillUnmount() {
            this._isMounted = false;
            // console.log("from unmount");
        }

        render() {
            /*
            We can get away with calling these functions every render because of clever use of memoizeOne.
            In fact, since this.getPrimaryViewPromise() asynchronously sets state, we MUST use memoizeOne to prevent
            infinite loops!
            */
            return (
                <WrappedComponent
                    alignments={this.fetchAlignments(this.props.viewRegion, this.getVisualizationWidth())}
                    basesPerPixel={this.props.viewRegion.getWidth() / this.getVisualizationWidth()}
                    primaryViewPromise={this.fetchPrimaryView(
                        this.props.viewRegion,
                        this.props.tracks,
                        this.getVisualizationWidth()
                    )}
                    primaryView={this.state.primaryView}
                    {...this.props}
                />
            );
        }
    }

    return withTrackLegendWidth(TrackViewManager);
}
