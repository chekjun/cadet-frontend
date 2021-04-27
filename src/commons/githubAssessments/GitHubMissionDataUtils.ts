import { Octokit } from '@octokit/rest';

import MissionData from './MissionData';
import MissionMetadata from './MissionMetadata';
import MissionRepoData from './MissionRepoData';
import TaskData from './TaskData';

const maximumTasksPerMission = 20;

export async function getMissionData(missionRepoData: MissionRepoData, octokit: any) {
  const briefingString = await getContentAsString(
    missionRepoData.repoOwner,
    missionRepoData.repoName,
    '/README.md',
    octokit
  );

  const metadataString = await getContentAsString(
    missionRepoData.repoOwner,
    missionRepoData.repoName,
    '/METADATA',
    octokit
  );

  const missionMetadata = convertMetadataStringToMissionMetadata(metadataString);

  const tasksData = await getTasksData(
    missionRepoData.repoOwner,
    missionRepoData.repoName,
    octokit
  );

  return new MissionData(missionRepoData, briefingString, missionMetadata, tasksData);
}

export async function getTasksData(repoOwner: string, repoName: string, octokit: Octokit) {
  const questions: TaskData[] = [];

  const results = await octokit.repos.getContent({
    owner: repoOwner,
    repo: repoName,
    path: ''
  });

  const files = results.data;

  if (!Array.isArray(files)) {
    return questions;
  }

  for (let i = 1; i <= maximumTasksPerMission; i++) {
    const questionFolderName = 'Q' + i;

    // We make the assumption that there are no gaps in question numbering
    // If the question does not exist, we may break
    if (files.find(file => file.name === questionFolderName) === undefined) {
      break;
    }

    // If the question exists, get the data
    try {
      const taskDescription = await getContentAsString(
        repoOwner,
        repoName,
        questionFolderName + '/Problem.md',
        octokit
      );
      const starterCode = await getContentAsString(
        repoOwner,
        repoName,
        questionFolderName + '/StarterCode.js',
        octokit
      );

      const taskData = new TaskData(taskDescription, starterCode);

      questions.push(taskData);
    } catch (err) {
      console.error(err);
    }
  }

  return questions;
}

export async function getContentAsString(
  repoOwner: string,
  repoName: string,
  filepath: string,
  octokit: any
) {
  const fileInfo = await octokit.repos.getContent({
    owner: repoOwner,
    repo: repoName,
    path: filepath
  });

  return Buffer.from((fileInfo.data as any).content, 'base64').toString();
}

function convertMetadataStringToMissionMetadata(metadataString: string) {
  const missionMetadata = new MissionMetadata();
  const stringPropsToExtract = ['coverImage', 'kind', 'number', 'title', 'reading', 'webSummary'];
  const numPropsToExtract = ['sourceVersion'];

  const retVal = parseMetadataProperties<MissionMetadata>(
    missionMetadata,
    stringPropsToExtract,
    numPropsToExtract,
    metadataString
  );

  return retVal;
}

export function parseMetadataProperties<R>(
  propertyContainer: R,
  stringProps: string[],
  numProps: string[],
  metadataString: string
) {
  const lines = metadataString.replace(/\r/g, '').split(/\n/);

  lines.forEach(line => {
    for (let i = 0; i < stringProps.length; i++) {
      const propName = stringProps[i];

      if (line.startsWith(propName)) {
        propertyContainer[propName] = line.substr(propName.length + 1);
        return;
      }
    }

    for (let i = 0; i < numProps.length; i++) {
      const propName = numProps[i];
      if (line.startsWith(propName)) {
        propertyContainer[propName] = parseInt(line.substr(propName.length + 1), 10);
        return;
      }
    }
  });

  return propertyContainer;
}