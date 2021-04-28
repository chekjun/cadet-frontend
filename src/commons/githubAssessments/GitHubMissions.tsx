import { Button, Card, Elevation, H4, H6, NonIdealState, Text } from '@blueprintjs/core';
import { IconNames } from '@blueprintjs/icons';
import { Octokit } from '@octokit/rest';
import * as React from 'react';
import { useEffect, useState } from 'react';
import { useMediaQuery } from 'react-responsive';
import { NavLink } from 'react-router-dom';
import Markdown from 'src/commons/Markdown';
import { getGitHubOctokitInstance } from 'src/features/github/GitHubUtils';
import { store } from 'src/pages/createStore';

import defaultCoverImage from '../../assets/default_cover_image.jpg';
import ContentDisplay from '../ContentDisplay';
import { actions } from '../utils/ActionsHelper';
import Constants from '../utils/Constants';
import { getContentAsString, parseMetadataProperties } from './GitHubMissionDataUtils';
import MissionRepoData from './MissionRepoData';

export const GitHubMissions: React.FC<any> = props => {
  const isMobileBreakpoint = useMediaQuery({ maxWidth: Constants.mobileBreakpoint });

  const [missionRepos, setMissionRepos] = useState<MissionRepoData[]>([]);
  const [browsableMissions, setBrowsableMissions] = useState<BrowsableMission[]>([]);

  const octokit = getGitHubOctokitInstance();

  useEffect(() => {
    getMissionRepoData(octokit);
  }, [octokit]);

  useEffect(() => {
    convertMissionReposToBrowsableMissions(octokit, missionRepos);
  }, [octokit, missionRepos]);

  let display: JSX.Element;
  if (octokit === undefined) {
    display = (
      <NonIdealState description="Please sign in to GitHub." icon={IconNames.WARNING_SIGN} />
    );
  } else if (missionRepos.length === 0) {
    display = <NonIdealState title="There are no assessments." icon={IconNames.FLAME} />;
  } else {
    const cards = browsableMissions.map(element =>
      convertMissionToCard(element, isMobileBreakpoint)
    );
    display = <>{cards}</>;
  }

  // Finally, render the ContentDisplay.
  return (
    <div className="Academy">
      <div className="Assessment">
        <ContentDisplay display={display} loadContentDispatch={getGitHubOctokitInstance} />
      </div>
    </div>
  );

  async function getMissionRepoData(octokit: Octokit) {
    if (octokit === undefined) return;
    const results = await octokit.repos.listForAuthenticatedUser({ per_page: 100 });
    const repos = results.data;
    setMissionRepos(
      repos
        .filter((repo: any) => repo.name.startsWith('SA-'))
        .map(
          (repo: any) => new MissionRepoData(repo.owner.login, repo.name, repo.created_at)
        ) as MissionRepoData[]
    );
  }

  async function convertMissionReposToBrowsableMissions(
    octokit: Octokit,
    missionRepos: MissionRepoData[]
  ) {
    if (octokit === undefined) return;
    const browsableMissions: BrowsableMission[] = [];

    for (let i = 0; i < missionRepos.length; i++) {
      browsableMissions.push(await convertRepoToBrowsableMission(missionRepos[i], octokit));
    }

    setBrowsableMissions(browsableMissions);
  }
};

async function convertRepoToBrowsableMission(missionRepo: MissionRepoData, octokit: Octokit) {
  const metadata = await getContentAsString(
    missionRepo.repoOwner,
    missionRepo.repoName,
    '/METADATA',
    octokit
  );
  const browsableMission = createBrowsableMission(missionRepo, metadata);

  return browsableMission;
}

class BrowsableMission {
  title: string = '';
  coverImage: string = '';
  webSummary: string = '';
  missionRepoData: MissionRepoData = new MissionRepoData('', '', '');
}

function createBrowsableMission(missionRepo: MissionRepoData, metadata: string) {
  const browsableMission = new BrowsableMission();

  browsableMission.missionRepoData = missionRepo;

  const stringProps = ['coverImage', 'title', 'webSummary'];
  const dateProps = ['dueDate'];

  const retVal = parseMetadataProperties<BrowsableMission>(
    browsableMission,
    stringProps,
    [],
    dateProps,
    metadata
  );

  return retVal;
}

function convertMissionToCard(missionRepo: BrowsableMission, isMobileBreakpoint: boolean) {
  const ratio = isMobileBreakpoint ? 5 : 3;
  const ownerSlashName =
    missionRepo.missionRepoData.repoOwner + '/' + missionRepo.missionRepoData.repoName;

  return (
    <div key={ownerSlashName}>
      <Card className="row listing" elevation={Elevation.ONE}>
        <div className={`col-xs-${String(ratio)} listing-picture`}>
          <img
            alt="Assessment"
            className={`cover-image-${missionRepo.title}`}
            src={missionRepo.coverImage ? missionRepo.coverImage : defaultCoverImage}
          />
        </div>

        <div className={`col-xs-${String(12 - ratio)} listing-text`}>
          <div className="listing-header">
            <Text ellipsize={true}>
              <H4 className="listing-title">{missionRepo.title}</H4>
              <H6>{ownerSlashName}</H6>
            </Text>
          </div>

          <div className="listing-description">
            <Markdown content={missionRepo.webSummary} />
          </div>

          <div className="listing-footer">
            <div className="listing-button">
            <NavLink
              to={`/githubassessments/editor`}>
              <Button
                icon={IconNames.PLAY}
                minimal={true}
                // intentional: each listing renders its own version of onClick
                // tslint:disable-next-line:jsx-no-lambda
                onClick={() => {
                  loadIntoEditor(missionRepo.missionRepoData);
                }}
              >
                <span className="custom-hidden-xxxs">Open</span>
              </Button>
            </NavLink>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}

async function loadIntoEditor (missionRepoData: MissionRepoData) {
  store.dispatch(actions.setGitHubAssessment(missionRepoData));
}
