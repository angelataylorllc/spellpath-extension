import { useState, useCallback } from 'react';
import { StoryEngine } from './engine';

export const useStory = (storyData) => {
  const [storyEngine] = useState(() => new StoryEngine(storyData));
  const [currentNodeKey, setCurrentNodeKey] = useState('start');

  const navigateToNode = useCallback((nodeKey) => {
    if (storyEngine.navigateToNode(nodeKey)) {
      setCurrentNodeKey(nodeKey);
    }
  }, [storyEngine]);

  const goBack = useCallback(() => {
    if (storyEngine.goBack()) {
      setCurrentNodeKey(storyEngine.getCurrentNodeKey());
    }
  }, [storyEngine]);

  const reset = useCallback(() => {
    storyEngine.reset();
    setCurrentNodeKey('start');
  }, [storyEngine]);

  const currentNode = storyEngine.getCurrentNode();
  const hasChoices = storyEngine.hasChoices();
  const isEndNode = storyEngine.isEndNode();
  const history = storyEngine.getHistory();

  return {
    currentNode,
    currentNodeKey,
    hasChoices,
    isEndNode,
    history,
    navigateToNode,
    goBack,
    reset
  };
};
