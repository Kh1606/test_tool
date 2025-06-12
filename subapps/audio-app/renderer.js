let selectedFiles = [];

// --- UI Element References ---
const browseInputBtn = document.getElementById('browseInput');
const folderPathInput = document.getElementById('folderPath');
const binsInput = document.getElementById('bins');
const analyzeBtn = document.getElementById('analyzeBtn');
const outputTextarea = document.getElementById('outputText');
const folderInput = document.createElement('input');
folderInput.type = 'file';
folderInput.style.display = 'none';
folderInput.webkitdirectory = true;
folderInput.multiple = true;
document.body.appendChild(folderInput);

let sizeChart, durationChart, bitrateChart, channelChart;

// --- Browse Button ---
browseInputBtn.addEventListener('click', () => {
  folderInput.value = "";
  folderInput.click();
});

// --- Folder Selection ---
folderInput.addEventListener('change', (e) => {
  selectedFiles = Array.from(e.target.files).filter(file =>
    /\.(mp3|wav|aac|m4a)$/i.test(file.name)
  );
  if (selectedFiles.length > 0) {
    // Set folder name from first file's relative path
    folderPathInput.value = selectedFiles[0].webkitRelativePath
      ? selectedFiles[0].webkitRelativePath.split('/')[0]
      : '';
  } else {
    folderPathInput.value = '';
  }
});

// --- Analyze Button ---
analyzeBtn.addEventListener('click', async () => {
  const binsVal = parseInt(binsInput.value, 10);
  if (!selectedFiles.length || isNaN(binsVal)) {
    alert("Please select a folder and enter a valid number of bins.");
    return;
  }
  outputTextarea.value = "Processing... Please wait.\n";
  const audios = [];
  let idx = 0;
  for (const file of selectedFiles) {
    idx++;
    outputTextarea.value = `Processing file ${idx} of ${selectedFiles.length}: ${file.name}\n`;
    // Hash (SHA-512, showing first 32 chars as a short "MD5" style)
    const hashBuffer = await crypto.subtle.digest('SHA-512', await file.arrayBuffer());
    const hash = Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
    // Get audio metadata (duration in seconds, channel count)
    const { duration, channels } = await getAudioMetadata(file);
    // Bitrate (bits/sec, estimated as size*8/duration)
    const bitrate = duration > 0 ? Math.round((file.size * 8) / duration) : 0;
    audios.push({
      filename: file.name,
      filesize: file.size,
      duration: Math.round(duration * 1000), // ms
      bitrate: bitrate, // bits/sec
      channels,
      hash_md5: hash.slice(0, 32)
    });
  }
  // Output summary
  outputTextarea.value =
    `Total Files: ${audios.length}\n` +
    `Bins Used: ${binsVal}\n\n` +
    "Detailed Info:\n";
  audios.forEach((audio, idx) => {
    outputTextarea.value +=
      `#${idx + 1} - ${audio.filename}\n` +
      `   Size: ${audio.filesize} bytes\n` +
      `   Duration: ${audio.duration} ms\n` +
      `   Bitrate: ${audio.bitrate} bits/s\n` +
      `   Channels: ${audio.channels}\n` +
      `   Hash: ${audio.hash_md5}\n\n`;
  });
  buildCharts({ audios, bins: binsVal });
});

// --- Get audio metadata using Web Audio API ---
function getAudioMetadata(file) {
  return new Promise((resolve) => {
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const reader = new FileReader();
    reader.onload = function (e) {
      audioCtx.decodeAudioData(e.target.result, (buffer) => {
        resolve({ duration: buffer.duration, channels: buffer.numberOfChannels });
        // Close context to avoid too many open contexts error in Chrome
        audioCtx.close();
      }, () => {
        resolve({ duration: 0, channels: 0 });
        audioCtx.close();
      });
    };
    reader.readAsArrayBuffer(file);
  });
}

// --- Histogram Data Helper (unchanged) ---
function createHistogramData(values, numBins) {
  if (!values || values.length === 0) {
    return { histogramLabels: [], histogramValues: [] };
  }
  if (values.length === 1) {
    return { histogramLabels: [String(values[0])], histogramValues: [1] };
  }
  const minVal = Math.min(...values);
  const maxVal = Math.max(...values);
  if (minVal === maxVal) {
    return {
      histogramLabels: [String(minVal)],
      histogramValues: [values.length]
    };
  }
  const binEdges = [];
  for (let i = 0; i <= numBins; i++) {
    binEdges.push(minVal + i * (maxVal - minVal) / numBins);
  }
  const binCounts = new Array(numBins).fill(0);
  for (let val of values) {
    for (let i = 0; i < numBins; i++) {
      if (val >= binEdges[i] && val < binEdges[i + 1]) {
        binCounts[i]++;
        break;
      }
      if (i === numBins - 1 && val === binEdges[i + 1]) {
        binCounts[i]++;
      }
    }
  }
  const histogramLabels = [];
  for (let i = 0; i < numBins; i++) {
    const lower = binEdges[i];
    const upper = binEdges[i + 1];
    histogramLabels.push(`${Math.round(lower)} - ${Math.round(upper)}`);
  }
  return {
    histogramLabels,
    histogramValues: binCounts
  };
}

// --- Chart Rendering (re-use your code!) ---
function buildCharts(parsedData) {
  const sizes = parsedData.audios.map(a => a.filesize);
  const durations = parsedData.audios.map(a => a.duration);
  const bitrates = parsedData.audios.map(a => a.bitrate);
  const channelsArr = parsedData.audios.map(a => a.channels);
  const bins = parsedData.bins || 10;

  // --- FILE SIZE HISTOGRAM ---
  const { histogramLabels: sizeLabels, histogramValues: sizeValues } = createHistogramData(sizes, bins);
  if (sizeChart) sizeChart.destroy();
  const sizeCtx = document.getElementById('sizeChart').getContext('2d');
  sizeChart = new Chart(sizeCtx, {
    type: 'bar',
    data: {
      labels: sizeLabels,
      datasets: [{ label: 'File Size (bytes)', data: sizeValues }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: { y: { beginAtZero: true } }
    }
  });

  // --- DURATION HISTOGRAM ---
  const { histogramLabels: durLabels, histogramValues: durValues } = createHistogramData(durations, bins);
  if (durationChart) durationChart.destroy();
  const durationCtx = document.getElementById('durationChart').getContext('2d');
  durationChart = new Chart(durationCtx, {
    type: 'bar',
    data: {
      labels: durLabels,
      datasets: [{ label: 'Duration (ms)', data: durValues }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: { y: { beginAtZero: true } }
    }
  });

  // --- BITRATE (Pie) ---
  const bitrateCounts = {};
  for (let b of bitrates) {
    const kbpsLabel = Math.floor(b / 1000) + ' kbps';
    bitrateCounts[kbpsLabel] = (bitrateCounts[kbpsLabel] || 0) + 1;
  }
  const bitrateLabels = Object.keys(bitrateCounts);
  const bitrateValues = Object.values(bitrateCounts);
  if (bitrateChart) bitrateChart.destroy();
  const bitrateCtx = document.getElementById('bitrateChart').getContext('2d');
  bitrateChart = new Chart(bitrateCtx, {
    type: 'pie',
    data: {
      labels: bitrateLabels,
      datasets: [{ label: 'Bitrate Distribution', data: bitrateValues }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false
    }
  });

  // --- CHANNELS (Pie) ---
  const channelCounts = {};
  for (let c of channelsArr) {
    const cLabel = c + ' channels';
    channelCounts[cLabel] = (channelCounts[cLabel] || 0) + 1;
  }
  const channelLabels = Object.keys(channelCounts);
  const channelValues = Object.values(channelCounts);
  if (channelChart) channelChart.destroy();
  const channelCtx = document.getElementById('channelChart').getContext('2d');
  channelChart = new Chart(channelCtx, {
    type: 'pie',
    data: {
      labels: channelLabels,
      datasets: [{ data: channelValues }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false
    }
  });
}
