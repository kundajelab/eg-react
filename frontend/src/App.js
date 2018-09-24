import React from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { ActionCreators } from './AppState';
import GenomePicker from './components/GenomePicker';
import Nav from './components/Nav';
import GenomeNavigator from './components/genomeNavigator/GenomeNavigator';
import TrackContainer from './components/trackContainers/TrackContainer';
import withCurrentGenome from './components/withCurrentGenome';
import { BrowserScene } from './components/vr/BrowserScene';
import ErrorBoundary from './components/ErrorBoundary';
import DisplayedRegionModel from './model/DisplayedRegionModel';
import TrackModel from './model/TrackModel';
import Notifications from 'react-notify-toast';
import LoadSession from './components/LoadSession';
import { RegionExpander } from './model/RegionExpander';

import './App.css';

const REGION_EXPANDER = new RegionExpander(1);

function mapStateToProps(state) {
    return {
        viewRegion: state.browser.present.viewRegion,
        tracks: state.browser.present.tracks,
        bundleId: state.browser.present.bundleId,
        sessionFromUrl: state.browser.present.sessionFromUrl,
        trackLegendWidth: state.browser.present.trackLegendWidth,
        isShowingNavigator: state.browser.present.isShowingNavigator,
    };
}

const callbacks = {
    onNewViewRegion: ActionCreators.setViewRegion,
    onTracksChanged: ActionCreators.setTracks,
    onLegendWidthChange: ActionCreators.setTrackLegendWidth,
    onToggleNavigator: ActionCreators.toggleNavigator,
};


const withAppState = connect(mapStateToProps, callbacks);
const withEnhancements = _.flowRight(withAppState, withCurrentGenome);

class App extends React.Component {
    static propTypes = {
        genomeConfig: PropTypes.object,
        viewRegion: PropTypes.instanceOf(DisplayedRegionModel),
        tracks: PropTypes.arrayOf(PropTypes.instanceOf(TrackModel)),
        onNewViewRegion: PropTypes.func,
        onTracksChanged: PropTypes.func,
    };

    constructor(props) {
        super(props);
        this.state = {
            isShowing3D: false,
            // isShowingNavigator: true,
            highlightEnteredRegion: true,
            enteredRegion: null,
            publicTracksPool: [],
            customTracksPool: [],
        };
        this.addTracksToPool = this.addTracksToPool.bind(this);
        this.addTracks = this.addTracks.bind(this);
        this.removeTrack = this.removeTrack.bind(this);
    }

    /**
     * Adds a list of tracks to the list of all tracks available from a public or custom hub.
     * 
     * @param {TrackModel[]} newTracks - additions to the list of all tracks available from a hub
     * @param {boolean} toPublic - whether to also add the tracks to public or custom pool
     */
    addTracksToPool(newTracks, toPublic=true) {
        if (toPublic) {
            this.setState({publicTracksPool: this.state.publicTracksPool.concat(newTracks)});
        } else {
            this.setState({customTracksPool: this.state.customTracksPool.concat(newTracks)});
        }
    }

    addTracks(tracks) {
        const newTracks = this.props.tracks.concat(tracks);
        this.props.onTracksChanged(newTracks);
    }

    removeTrack(indexToRemove) {
        let newTracks = this.props.tracks.filter((track, index) => index !== indexToRemove);
        this.props.onTracksChanged(newTracks);
    }

    // toggleNavigator = () => {
    //     this.setState(prevState => {return {isShowingNavigator: !prevState.isShowingNavigator}});
    // };

    toggle3DScene = () => {
        this.setState(prevState => {return {isShowing3D: !prevState.isShowing3D}});
    };

    toggleHighlight = () => {
        this.setState(prevState => {return {highlightEnteredRegion: !prevState.highlightEnteredRegion}});
    };

    setEnteredRegion = (interval) => {
        this.setState({enteredRegion: interval});
    }

    render() {
        const {genomeConfig, viewRegion, tracks, onNewViewRegion, bundleId, 
                sessionFromUrl, trackLegendWidth, onLegendWidthChange, isShowingNavigator, onToggleNavigator} = this.props;
        if (sessionFromUrl) {
            return <div className="container-fluid"><LoadSession bundleId={bundleId} /></div>;
        }
        if (!genomeConfig) {
            return <div className="container-fluid"><GenomePicker /></div>;
        }

        return (
        <div className="App container-fluid">
            <Nav
                {...this.state}
                isShowingNavigator={isShowingNavigator}
                onToggleNavigator={onToggleNavigator}
                onToggle3DScene={this.toggle3DScene}
                onToggleHighlight={this.toggleHighlight}
                onSetEnteredRegion={this.setEnteredRegion}
                selectedRegion={viewRegion}
                onRegionSelected={onNewViewRegion} 
                tracks={tracks}
                genomeConfig={genomeConfig}
                onTracksAdded={this.addTracks}
                onTrackRemoved={this.removeTrack}
                bundleId={bundleId}
                trackLegendWidth={trackLegendWidth}
                onLegendWidthChange={onLegendWidthChange}
                onAddTracksToPool={this.addTracksToPool}
            />
             <Notifications />
            {isShowingNavigator &&
                <GenomeNavigator selectedRegion={viewRegion} onRegionSelected={onNewViewRegion} />
            }
            {
            this.state.isShowing3D &&
                <ErrorBoundary><BrowserScene viewRegion={viewRegion} tracks={tracks} /></ErrorBoundary>
            }
            <TrackContainer 
                enteredRegion={this.state.enteredRegion} 
                highlightEnteredRegion={this.state.highlightEnteredRegion}
                expansionAmount={REGION_EXPANDER}
            />
        </div>
        );
    }
}

export default withEnhancements(App);
