// Helper: compute SHA-256 hash (browser doesn't support MD5 natively)
async function computeFileHash(file) {
  const arrayBuffer = await file.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
  // Convert buffer to hex string
  return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
}

// Helper: get image dimensions
function getImageDimensions(file) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = function () {
      resolve({ width: img.width, height: img.height });
    };
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
}

// When "Analyze" button is clicked
document.getElementById('analyzeBtn').addEventListener('click', async () => {
  const input = document.getElementById('folderInput');
  const bins = parseInt(document.getElementById('bins').value, 10);
  const outputText = document.getElementById('outputText');
  const files = Array.from(input.files);
  outputText.value = '';

  // Only accept image files by extension
  const allowedExt = ['.jpg', '.jpeg', '.png', '.gif'];
  const imageFiles = files.filter(file =>
    allowedExt.includes(file.name.slice(file.name.lastIndexOf('.')).toLowerCase())
  );

  let images = [];
  for (const file of imageFiles) {
    try {
      const hash = await computeFileHash(file);
      const { width, height } = await getImageDimensions(file);
      images.push({
        filename: file.name,
        size: file.size,
        resolution: { width, height },
        hash: hash
      });

      outputText.value += `Name: ${file.name}, Size: ${file.size} bytes, Resolution: ${width}x${height}, Hash: ${hash}\n`;
    } catch (e) {
      outputText.value += `Error processing ${file.name}: ${e}\n`;
    }
  }

  outputText.value += `Total number of images: ${images.length}\n`;

  updateBarChart(images, bins);
  updatePieChart(images);
  document.getElementById('chartContainer').style.display = 'flex';
});

// -- Bar Chart (same logic as before, but change images input) --
function updateBarChart(images, bins) {
  const sizes = images.map(img => img.size);
  if (sizes.length === 0) return;
  const minSize = Math.min(...sizes);
  const maxSize = Math.max(...sizes);
  const binSize = (maxSize - minSize) / bins;
  let counts = new Array(bins).fill(0);

  sizes.forEach(size => {
    let binIndex = Math.floor((size - minSize) / binSize);
    if (binIndex >= bins) binIndex = bins - 1;
    counts[binIndex]++;
  });

  const labels = counts.map((_, i) => {
    const lower = Math.round(minSize + i * binSize);
    const upper = Math.round(minSize + (i + 1) * binSize);
    return `${lower}-${upper}`;
  });

  const ctx = document.getElementById('barChartCanvas').getContext('2d');
  if (window.barChartInstance) window.barChartInstance.destroy();
  window.barChartInstance = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [{
        label: 'Image Sizes (bytes)',
        data: counts,
        backgroundColor: 'rgba(54, 162, 235, 0.5)',
        borderColor: 'rgba(54, 162, 235, 1)',
        borderWidth: 1
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: { y: { beginAtZero: true } }
    }
  });
}

// -- Pie Chart (same logic as before) --
function updatePieChart(images) {
  const resolutionCounts = {};
  images.forEach(img => {
    const key = `${img.resolution.width}x${img.resolution.height}`;
    resolutionCounts[key] = (resolutionCounts[key] || 0) + 1;
  });

  let groups = Object.keys(resolutionCounts).map(key => ({
    label: key,
    count: resolutionCounts[key]
  }));
  groups.sort((a, b) => b.count - a.count);
  if (groups.length > 9) {
    const topGroups = groups.slice(0, 9);
    const othersCount = groups.slice(9).reduce((sum, group) => sum + group.count, 0);
    topGroups.push({ label: 'Others', count: othersCount });
    groups = topGroups;
  }
  const labels = groups.map(g => g.label);
  const data = groups.map(g => g.count);

  const backgroundColors = labels.map(() => {
    const r = Math.floor(Math.random() * 255);
    const g = Math.floor(Math.random() * 255);
    const b = Math.floor(Math.random() * 255);
    return `rgba(${r}, ${g}, ${b}, 0.5)`;
  });

  const ctx = document.getElementById('pieChartCanvas').getContext('2d');
  if (window.pieChartInstance) window.pieChartInstance.destroy();
  window.pieChartInstance = new Chart(ctx, {
    type: 'pie',
    data: {
      labels: labels,
      datasets: [{
        data: data,
        backgroundColor: backgroundColors,
        borderColor: backgroundColors.map(color => color.replace('0.5', '1')),
        borderWidth: 1
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: 'right', labels: { padding: 20 } }
      }
    }
  });
}
