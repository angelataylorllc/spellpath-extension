export class StoryEngine {
  constructor(story) {
    this.story = story;
    this.currentNodeKey = 'start';
    this.history = [];
  }

  getCurrentNode() {
    return this.story[this.currentNodeKey];
  }

  navigateToNode(nodeKey) {
    if (this.story[nodeKey]) {
      this.history.push(this.currentNodeKey);
      this.currentNodeKey = nodeKey;
      return true;
    }
    return false;
  }

  goBack() {
    if (this.history.length > 0) {
      this.currentNodeKey = this.history.pop();
      return true;
    }
    return false;
  }

  reset() {
    this.currentNodeKey = 'start';
    this.history = [];
  }

  getHistory() {
    return [...this.history];
  }

  getCurrentNodeKey() {
    return this.currentNodeKey;
  }

  hasChoices() {
    const node = this.getCurrentNode();
    return node && node.choices && node.choices.length > 0;
  }

  isEndNode() {
    const node = this.getCurrentNode();
    return node && (!node.choices || node.choices.length === 0);
  }
}
