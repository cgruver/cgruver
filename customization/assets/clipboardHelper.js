const codeBlocks = document.querySelectorAll('.highlighter-rouge');
const copyCodeBlocks = document.querySelectorAll('.copy-code-block');

copyCodeBlocks.forEach((copyCodeBlock, index) => {
  const code = codeBlocks[index].innerText;

  copyCodeBlock.addEventListener('click', () => {
    window.navigator.clipboard.writeText(code);
    copyCodeBlock.classList.add('copied');

    setTimeout(() => {
      copyCodeBlock.classList.remove('copied');
    }, 2500);
  });
});
