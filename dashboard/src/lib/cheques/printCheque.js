/**
 * Opens print dialog for a cheque preview node.
 * @param {HTMLElement} node
 */
export function printChequeElement(node) {
  const root = document.createElement('div');
  root.className = 'cheque-preview-print-root';
  root.appendChild(node.cloneNode(true));
  document.body.appendChild(root);
  document.body.classList.add('cheque-print-mode');
  const cleanup = () => {
    document.body.classList.remove('cheque-print-mode');
    root.remove();
    window.removeEventListener('afterprint', cleanup);
  };
  window.addEventListener('afterprint', cleanup);
  window.print();
  setTimeout(cleanup, 1000);
}
