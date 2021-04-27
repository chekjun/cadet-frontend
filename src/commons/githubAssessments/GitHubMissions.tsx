import { Button, Card, Classes, Elevation, H4, H6, Text } from '@blueprintjs/core';
import { IconNames } from '@blueprintjs/icons';
import { Octokit } from '@octokit/rest';
import classNames from 'classnames';
import * as React from 'react';
import { useEffect, useState } from 'react';
import { useMediaQuery } from 'react-responsive';
import Markdown from 'src/commons/Markdown';

import defaultCoverImage from '../../assets/default_cover_image.jpg';
import Constants from '../utils/Constants';
import { getContentAsString, parseMetadataProperties } from './GitHubMissionDataUtils';
import MissionRepoData from './MissionRepoData';

export const GitHubMissions: React.FC<any> = props => {
  const isMobileBreakpoint = useMediaQuery({ maxWidth: Constants.mobileBreakpoint });

  const [missionRepos, setMissionRepos] = useState<MissionRepoData[]>([]);
  const [browsableMissions, setBrowsableMissions] = useState<BrowsableMission[]>([]);

  useEffect(() => {
    if (props.githubOctokitInstance !== undefined) {
      const octokit = props.githubOctokitInstance;
      console.log(octokit);
      getMissionRepoData(octokit.repos.listForAuthenticatedUser);
    }
    console.log('no');
  }, [props.githubOctokitInstance]);

  useEffect(() => {
    convertMissionReposToBrowsableMissions(missionRepos, props.githubOctokitInstance, setBrowsableMissions);
  }, [missionRepos, props.githubOctokitInstance]);

  // Finally, render the ContentDisplay.
  return (
    <div>
      <div className={classNames('githubDialogHeader', Classes.DIALOG_HEADER)}>
        <h3>Select a Mission</h3>
      </div>
      <div className={Classes.DIALOG_BODY}>
        <div className="missionBrowserContent">
          {browsableMissions.map(missionRepo =>
            convertMissionToCard(missionRepo, isMobileBreakpoint)
          )}
        </div>
      </div>
    </div>
  );

  async function getMissionRepoData(getRepos: any) {
    const repos = (await getRepos({ per_page: 100 })).data;
    setMissionRepos(repos
      .filter((repo: any) => repo.name.startsWith('SA-'))
      .map((repo: any) => new MissionRepoData(repo.owner.login, repo.name)) as MissionRepoData[]);
  }
};



async function convertMissionReposToBrowsableMissions(
  missionRepos: MissionRepoData[],
  octokit: Octokit,
  setBrowsableMissions: any
) {
  const browsableMissions: BrowsableMission[] = [];

  for (let i = 0; i < missionRepos.length; i++) {
    browsableMissions.push(await convertRepoToBrowsableMission(missionRepos[i], octokit));
  }

  setBrowsableMissions(browsableMissions);
}

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
  missionRepoData: MissionRepoData = new MissionRepoData('', '');
}

function createBrowsableMission(missionRepo: MissionRepoData, metadata: string) {
  const browsableMission = new BrowsableMission();

  browsableMission.missionRepoData = missionRepo;

  const propertiesToExtract = ['coverImage', 'title', 'webSummary'];

  const retVal = parseMetadataProperties<BrowsableMission>(
    browsableMission,
    propertiesToExtract,
    [],
    metadata
  );

  return retVal;
}

function convertMissionToCard(
  missionRepo: BrowsableMission,
  isMobileBreakpoint: boolean,
) {
  const ratio = isMobileBreakpoint ? 5 : 3;
  const ownerSlashName =
    missionRepo.missionRepoData.repoOwner + '/' + missionRepo.missionRepoData.repoName;

  return (
    <Card key={ownerSlashName} className="row listing" elevation={Elevation.ONE}>
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
            <Button
              icon={IconNames.PLAY}
              minimal={true}
              // intentional: each listing renders its own version of onClick
              // tslint:disable-next-line:jsx-no-lambda
              onClick={() => {
                loadintoeditor();
              }}
            >
              <span className="custom-hidden-xxxs">Open</span>
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}

const loadintoeditor = () => {

}
