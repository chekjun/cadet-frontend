import {
  AnchorButton,
  Button,
  Classes,
  Dialog,
  InputGroup,
  Intent,
  ITreeNode,
  Tree
} from '@blueprintjs/core';
import { Octokit } from '@octokit/rest';
import classNames from 'classnames';
import React, { useEffect, useState } from 'react';

import {
  checkIfFileCanBeOpened,
  checkIfFileCanBeSavedAndGetSaveType,
  checkIfUserAgreesToOverwriteEditorData,
  checkIfUserAgreesToPerformCreatingSave,
  checkIfUserAgreesToPerformOverwritingSave,
  openFileInEditor,
  performCreatingSave,
  performOverwritingSave
} from '../../features/github/GitHubUtils';
import { GetAuthenticatedReponse } from '../../features/github/OctokitTypes';
import { GitHubFileNodeData } from './GitHubFileNodeData';
import { GitHubTreeNodeCreator } from './GitHubTreeNodeCreator';

export type FileExplorerDialogProps = {
  repoName: string;
  pickerType: string;
  octokit: Octokit;
  editorContent: string;
  onSubmit: (submitContent: string) => void;
};

const FileExplorerDialog: React.FC<FileExplorerDialogProps> = props => {
  const [repoFiles, setRepoFiles] = useState<ITreeNode<GitHubFileNodeData>[]>([]);
  const [filePath, setFilePath] = useState('');
  const [commitMessage, setCommitMessage] = useState('');

  useEffect(() => {
    setFirstLayerRepoFiles(props.repoName, setRepoFiles);
  }, [props.repoName]);

  return (
    <Dialog className="githubDialog" isOpen={true} onClose={handleClose}>
      <div className={classNames('githubDialogHeader', Classes.DIALOG_HEADER)}>
        <h3>Select a File</h3>
      </div>
      <div className={Classes.DIALOG_BODY}>
        <Tree
          contents={repoFiles}
          onNodeClick={handleNodeClick}
          onNodeCollapse={handleNodeCollapse}
          onNodeExpand={handleNodeExpand}
          className={classNames('FileTree', Classes.ELEVATION_0)}
        />
        {props.pickerType === 'Save' && (
          <div>
            <InputGroup
              id="FileNameTextBox"
              onChange={handleFileNameChange}
              onClick={handleClickFileNameBox}
              placeholder={'Enter File Name'}
              value={filePath}
            />
            <InputGroup
              onChange={handleCommitMessageChange}
              placeholder={'Enter Commit Message'}
              value={commitMessage}
            />
          </div>
        )}
      </div>
      <div className={Classes.DIALOG_FOOTER}>
        <div className={Classes.DIALOG_FOOTER_ACTIONS}>
          <Button onClick={handleClose}>Close</Button>
          <AnchorButton onClick={handleSubmit} intent={Intent.PRIMARY} text={props.pickerType} />
        </div>
      </div>
    </Dialog>
  );

  async function setFirstLayerRepoFiles(repoName: string, setRepoFiles: any) {
    try {
      const initialRepoFiles = await GitHubTreeNodeCreator.getFirstLayerRepoFileNodes(repoName);
      setRepoFiles(initialRepoFiles);
    } catch (err) {
      console.error(err);
    }
  }

  function handleClose() {
    props.onSubmit('');
  }

  async function handleSubmit() {
    const authUser: GetAuthenticatedReponse = await props.octokit.users.getAuthenticated();
    const githubLoginID = authUser.data.login;
    const githubName = authUser.data.name;
    const githubEmail = authUser.data.email;

    if (props.pickerType === 'Open') {
      if (await checkIfFileCanBeOpened(props.octokit, githubLoginID, props.repoName, filePath)) {
        if (await checkIfUserAgreesToOverwriteEditorData()) {
          openFileInEditor(props.octokit, githubLoginID, props.repoName, filePath);
        }
      }
    }

    if (props.pickerType === 'Save') {
      const { canBeSaved, saveType } = await checkIfFileCanBeSavedAndGetSaveType(
        props.octokit,
        githubLoginID,
        props.repoName,
        filePath
      );

      if (canBeSaved) {
        if (saveType === 'Overwrite' && (await checkIfUserAgreesToPerformOverwritingSave())) {
          performOverwritingSave(
            props.octokit,
            githubLoginID,
            props.repoName,
            filePath,
            githubName,
            githubEmail,
            commitMessage,
            props.editorContent
          );
        }

        if (saveType === 'Create' && (await checkIfUserAgreesToPerformCreatingSave())) {
          performCreatingSave(
            props.octokit,
            githubLoginID,
            props.repoName,
            filePath,
            githubName,
            githubEmail,
            commitMessage,
            props.editorContent
          );
        }
      }
    }
  }

  async function handleNodeClick(
    treeNode: ITreeNode<GitHubFileNodeData>,
    _nodePath: number[],
    e: React.MouseEvent<HTMLElement>
  ) {
    const originallySelected = treeNode.isSelected;

    const allNodesCallback = !e.shiftKey
      ? (node: ITreeNode<GitHubFileNodeData>) => (node.isSelected = false)
      : (node: ITreeNode<GitHubFileNodeData>) => {};

    const specificNodeCallback = (node: ITreeNode<GitHubFileNodeData>) => {
      // if originally selected is null, set to true
      // else, toggle the selection
      node.isSelected = originallySelected === null ? true : !originallySelected;
      const newFilePath =
        node.nodeData !== undefined && node.isSelected ? node.nodeData.filePath : '';
      setFilePath(newFilePath);
    };

    const newRepoFiles = await cloneWithCallbacks(
      repoFiles,
      treeNode,
      allNodesCallback,
      specificNodeCallback
    );

    if (newRepoFiles !== null) {
      setRepoFiles(newRepoFiles);
    }
  }

  async function handleNodeCollapse(treeNode: ITreeNode<GitHubFileNodeData>) {
    const newRepoFiles = await cloneWithCallbacks(
      repoFiles,
      treeNode,
      (node: ITreeNode<GitHubFileNodeData>) => {},
      (node: ITreeNode<GitHubFileNodeData>) => (node.isExpanded = false)
    );

    if (newRepoFiles !== null) {
      setRepoFiles(newRepoFiles);
    }
  }

  async function handleNodeExpand(treeNode: ITreeNode<GitHubFileNodeData>) {
    const newRepoFiles = await cloneWithCallbacks(
      repoFiles,
      treeNode,
      (node: ITreeNode<GitHubFileNodeData>) => {},
      async (node: ITreeNode<GitHubFileNodeData>) => {
        node.isExpanded = true;

        if (node.nodeData !== undefined && !node.nodeData.childrenRetrieved) {
          node.childNodes = await GitHubTreeNodeCreator.getChildNodes(
            props.repoName,
            node.nodeData.filePath
          );
          node.nodeData.childrenRetrieved = true;
        }
      }
    );

    if (newRepoFiles !== null) {
      setRepoFiles(newRepoFiles);
    }
  }

  async function cloneWithCallbacks(
    treeNodes: ITreeNode<GitHubFileNodeData>[],
    treeNodeToEdit: ITreeNode<GitHubFileNodeData>,
    allNodesCallback: (node: ITreeNode<GitHubFileNodeData>) => void,
    specificNodeCallback: (node: ITreeNode<GitHubFileNodeData>) => void
  ) {
    if (treeNodes === null) {
      return null;
    }

    const newTreeNodes = [];

    for (let i = 0; i < treeNodes.length; i++) {
      const node = treeNodes[i];
      const clonedNode = Object.assign({}, node);
      await allNodesCallback(clonedNode);

      if (treeNodeToEdit === node) {
        await specificNodeCallback(clonedNode);
      }

      if (clonedNode.childNodes !== undefined) {
        const newChildNodes = await cloneWithCallbacks(
          clonedNode.childNodes,
          treeNodeToEdit,
          allNodesCallback,
          specificNodeCallback
        );

        if (newChildNodes !== null) {
          clonedNode.childNodes = newChildNodes;
        }
      }

      newTreeNodes.push(clonedNode);
    }

    return newTreeNodes;
  }

  function handleFileNameChange(e: any) {
    setFilePath(e.target.value);
  }

  function handleCommitMessageChange(e: any) {
    setCommitMessage(e.target.value);
  }

  function handleClickFileNameBox(e: any) {
    if (filePath === '') {
      setFilePath('.js');
    }
  }
};

export default FileExplorerDialog;
