
import React from "react";
import PropTypes from "prop-types";
import _ from "lodash";
import ReactTable from "react-table";
import Json5Fetcher from "../../model/Json5Fetcher";
import DataHubParser from '../../model/DataHubParser';
import withCurrentGenome from '../withCurrentGenome';

import "react-table/react-table.css";


/**
 * Table that displays available public track hubs.
 * 
 * @author Silas Hsu
 */
class HubTable extends React.PureComponent {
    static propTypes = {
        onHubLoaded: PropTypes.func,
    }

    constructor(props) {
        super(props);
        this.hubParser = new DataHubParser(1);
        this.state = {
            hubs: this.props.genomeConfig.publicHubList ? this.props.genomeConfig.publicHubList.slice(): []
        };
        this.loadHub = this.loadHub.bind(this);
        this.getAddHubCell = this.getAddHubCell.bind(this);

        this.columns = [
            {
                Header: "Collection",
                accessor: "collection"
            },
            {
                Header: "Hub name",
                accessor: "name"
            },
            {
                Header: "Tracks",
                accessor: "numTracks",
                aggregate: (values, rows) => _.sum(values),
                width: 100,
                filterable: false
            },
            {
                Header: "Add",
                Cell: this.getAddHubCell,
                width: 100,
                filterable: false,
            }
        ];
    }

    /**
     * Gets a copy of this table's hub list, except with one hub modified.
     * 
     * @param {number} index - the index of the hub to modify in this.state.hubs
     * @param {Partial<Hub>} propsToMerge - props to merge into the selected hub
     * @return copy of this table's hub list, with one hub modified
     */
    _cloneHubsAndModifyOne(index, propsToMerge) {
        let hubs = this.state.hubs.slice();
        let hub = _.cloneDeep(hubs[index]);
        Object.assign(hub, propsToMerge);
        hubs[index] = hub;
        return hubs;
    }

    /**
     * Loads the tracks in a hub and passes them to the callback specified by this.props
     * 
     * @param {number} index - the index of the hub in this.state.hubs
     */
    async loadHub(index) {
        if (this.props.onHubLoaded) {
            const hub = this.state.hubs[index];
            let newHubs = this._cloneHubsAndModifyOne(index, {isLoading: true});
            this.setState({hubs: newHubs});
            const json = await new Json5Fetcher().get(hub.url);
            const tracksStartIndex = hub.oldHubFormat ? 1 : 0;
            const tracks = await this.hubParser.getTracksInHub(json, hub.name, hub.oldHubFormat, tracksStartIndex);
            this.props.onHubLoaded(tracks);
            let loadedHubs = this._cloneHubsAndModifyOne(index, {isLoading: false, isLoaded: true});
            this.setState({hubs: loadedHubs});
        }
    }

    /**
     * Gets the cell under the "Add" column for a row.  There are three possible states - not loaded (so there should
     * be a button to initiate loading), loading, and loaded.
     * 
     * @param {Object} reactTableRow - a Row object that ReactTable provides
     * @return {JSX.Element} the cell to render
     */
    getAddHubCell(reactTableRow) {
        let hub = reactTableRow.original;
        if (hub.isLoaded) {
            return <span>✓</span>
        }

        if (hub.isLoading) {
            return <span>Loading...</span>
        }

        return <button onClick={() => this.loadHub(reactTableRow.index)}>+</button>
    }

    /**
     * @inheritdoc
     */
    render() {
        const {publicHubData} = this.props.genomeConfig;
        return <ReactTable
            filterable
            defaultPageSize={10}
            data={this.state.hubs}
            columns={this.columns}
            minRows={Math.min(this.state.hubs.length, 10)}
            SubComponent={row => {
                let collectionDetails = publicHubData[row.original.collection] || <i>No data available.</i>;
                let hubDetails = row.original.description || <i>No data available.</i>
                return (
                    <div style={{padding: "20px"}}>
                        <h3>Collection details</h3>
                        {collectionDetails}
                        <h3>Hub details</h3>
                        {hubDetails}
                    </div>
                );
            }}
            collapseOnSortingChange={false}
        />
    }
}

export default withCurrentGenome(HubTable);
