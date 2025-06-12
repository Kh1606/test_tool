let selectedFiles = []; // Array of File objects

// Trigger file input for files
document.getElementById('btn-select-files').addEventListener('click', () => {
  document.getElementById('fileInput').value = "";
  document.getElementById('fileInput').click();
});

// Trigger file input for folder
document.getElementById('btn-select-folder').addEventListener('click', () => {
  document.getElementById('folderInput').value = "";
  document.getElementById('folderInput').click();
});

// Handle file(s) selection
document.getElementById('fileInput').addEventListener('change', (e) => {
  const files = Array.from(e.target.files);
  selectedFiles = selectedFiles.concat(files);
  updateFileList();
});

// Handle folder selection
document.getElementById('folderInput').addEventListener('change', (e) => {
  const files = Array.from(e.target.files);
  selectedFiles = selectedFiles.concat(files);
  updateFileList();
});

// Calculate hash for each selected file
document.getElementById('btn-calculate').addEventListener('click', async () => {
  if (selectedFiles.length === 0) {
    alert("No files or folders selected!");
    return;
  }
  const results = [];
  for (const file of selectedFiles) {
    const hash = await computeFileHash(file);
    // Break hash into 5 lines (like your desktop app)
    let formatted = '';
    const chunkSize = Math.ceil(hash.length / 5);
    for (let i = 0; i < hash.length; i += chunkSize) {
      formatted += hash.substring(i, i + chunkSize) + '\n';
    }
    results.push({ file: file.webkitRelativePath || file.name, hash: formatted.trim() });
  }
  displayResults(results);
});

// Save results to file
document.getElementById('btn-save').addEventListener('click', () => {
  const resultText = document.getElementById('result-text').value;
  if (!resultText) {
    alert("No results to save!");
    return;
  }
  const blob = new Blob([resultText], { type: "text/plain" });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = "hash_results.txt";
  a.click();
  URL.revokeObjectURL(a.href);
  alert("Results file has been downloaded.");
});

// Update UI file list
function updateFileList() {
  const list = document.getElementById('files');
  list.innerHTML = '';
  selectedFiles.forEach((file, index) => {
    const li = document.createElement('li');
    li.textContent = (file.webkitRelativePath || file.name) + " ";
    // Remove button
    const btnRemove = document.createElement('button');
    btnRemove.textContent = 'Remove';
    btnRemove.classList.add('remove-btn');
    btnRemove.style.marginLeft = '10px';
    btnRemove.addEventListener('click', () => {
      selectedFiles.splice(index, 1);
      updateFileList();
    });
    li.appendChild(btnRemove);
    list.appendChild(li);
  });
}

// Display results
function displayResults(results) {
  const resultText = document.getElementById('result-text');
  let text = '';
  results.forEach(item => {
    text += `File: ${item.file}\nHash:\n${item.hash}\n\n`;
  });
  resultText.value = text;
}

// Hash function using SHA-512
async function computeFileHash(file) {
  const arrayBuffer = await file.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest('SHA-512', arrayBuffer);
  return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
}
