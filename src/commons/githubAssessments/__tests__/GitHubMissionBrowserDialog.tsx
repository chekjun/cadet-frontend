import { act, fireEvent, render, screen } from '@testing-library/react';

import { GitHubMissionBrowserDialog } from '../GitHubMissionBrowserDialog';
import MissionRepoData from '../MissionRepoData';

test('Selecting close causes resolveDialog to return empty string for owner and repoName', async () => {
  const octokit = new Mocktokit();

  const emptyMissionRepos: MissionRepoData[] = [];

  let returnedResponse = new MissionRepoData(
    'not-empty-owner',
    'not-empty-repoName',
    'not-empty-creation-date'
  );
  function resolveDialog(response: MissionRepoData) {
    returnedResponse = response;
  }

  act(() => {
    render(
      <GitHubMissionBrowserDialog
        octokit={octokit}
        missionRepos={emptyMissionRepos}
        resolveDialog={resolveDialog}
      />
    );
  });

  await screen.findByText('Select a Mission');

  fireEvent.click(screen.getByText('Close'));
  expect(returnedResponse.repoName).toBe('');
  expect(returnedResponse.repoOwner).toBe('');
});

test('Selecting open on a mission card causes resolveDialog to return owner and repoName', async () => {
  const octokit = new Mocktokit();

  const mockMissionRepoData = new MissionRepoData(
    'ownerName',
    'repoName',
    'December 17, 1995 03:24:00'
  );
  const mockMissionRepos: MissionRepoData[] = [mockMissionRepoData];

  let returnedResponse = new MissionRepoData(
    'notownerName',
    'notrepoName',
    'December 18, 1995 03:24:00'
  );
  function resolveDialog(response: MissionRepoData) {
    returnedResponse = response;
  }

  act(() => {
    render(
      <GitHubMissionBrowserDialog
        octokit={octokit}
        missionRepos={mockMissionRepos}
        resolveDialog={resolveDialog}
      />
    );
  });

  await screen.findByText('Open');
  fireEvent.click(screen.getByText('Open'));
  expect(returnedResponse).toStrictEqual(
    new MissionRepoData('ownerName', 'repoName', 'December 17, 1995 03:24:00')
  );
});

class Mocktokit {
  readonly repos = {
    getContent: this.getContent
  };

  async getContent(dummyObject: any) {
    const fakeContent = {
      data: {
        content:
          'dGl0bGU9aW5zZXJ0VGl0bGVIZXJlCndlYlN1bW1hcnk9aW5zZXJ0V2ViU3VtbWFyeUhlcmUKY292ZXJJbWFnZT1pbnNlcnRDb3ZlckltYWdlSGVyZQpzb3VyY2VWZXJzaW9uPTEKa2luZD0KbnVtYmVyPQpyZWFkaW5nPQ=='
      }
    };
    return fakeContent;
  }
}
