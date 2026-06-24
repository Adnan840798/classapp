type CloseCallback = () => void;

const stack: CloseCallback[] = [];

export const overlayStack = {
  push(closeFn: CloseCallback) {
    stack.push(closeFn);
  },
  pop(closeFn: CloseCallback) {
    const index = stack.indexOf(closeFn);
    if (index !== -1) {
      stack.splice(index, 1);
    }
  },
  trigger(): boolean {
    if (stack.length > 0) {
      const topmost = stack[stack.length - 1];
      topmost();
      return true;
    }
    return false;
  }
};
