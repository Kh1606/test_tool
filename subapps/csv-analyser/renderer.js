const analyzeBtn = document.getElementById('analyzeBtn');
const fileInput = document.getElementById('fileInput');
const output = document.getElementById('output');
const progressBar = document.getElementById('progressBar');

analyzeBtn.addEventListener('click', () => {
  fileInput.value = ""; // Reset previous selection
  fileInput.click();
});

fileInput.addEventListener('change', async () => {
  if (!fileInput.files.length) return;

  // Show progress bar
  progressBar.style.display = 'block';
  progressBar.value = 0;
  let progress = 0;
  const interval = setInterval(() => {
    if (progress < 90) {
      progress += 10;
      progressBar.value = progress;
    }
  }, 100);

  const file = fileInput.files[0];
  const reader = new FileReader();
  reader.onload = function(e) {
    clearInterval(interval);
    progressBar.value = 100;
    setTimeout(() => {
      progressBar.style.display = 'none';
      progressBar.value = 0;
    }, 500);

    try {
      const csv = e.target.result;
      const parsed = Papa.parse(csv, { header: true, dynamicTyping: true });
      const data = parsed.data;
      const meta = parsed.meta;
      const numRows = data.length;
      const numCols = meta.fields ? meta.fields.length : 0;
      let numMissing = 0;

      data.forEach(row => {
        meta.fields.forEach(field => {
          if (row[field] === null || row[field] === undefined || row[field] === '') {
            numMissing++;
          }
        });
      });

      // Compute descriptive statistics
      const describeStats = computeDescriptiveStats(data, meta.fields);

      // Build descriptive summary string
      const tableData = [];
      const headerRow = ["Statistic", ...meta.fields];
      tableData.push(headerRow);

      const statNames = ["count", "unique", "top", "freq", "mean", "std", "min", "25%", "50%", "75%", "max"];
      statNames.forEach(stat => {
        const row = [stat];
        meta.fields.forEach(field => {
          const value = describeStats[field][stat];
          let formatted = (typeof value === "number" && !isNaN(value)) ? value.toFixed(6) : String(value);
          row.push(formatted);
        });
        tableData.push(row);
      });

      // Compute max width for columns
      const colWidths = [];
      for (let col = 0; col < tableData[0].length; col++) {
        let maxLen = 0;
        for (let row = 0; row < tableData.length; row++) {
          maxLen = Math.max(maxLen, tableData[row][col].length);
        }
        colWidths.push(maxLen);
      }

      // Build the output string
      let describeStr = "Descriptive Statistics:\n";
      tableData.forEach((row, rowIndex) => {
        const rowStr = row
          .map((cell, colIndex) => cell.padEnd(colWidths[colIndex] + 2))
          .join("| ");
        describeStr += rowStr + "\n";
        if (rowIndex === 0) {
          const sepRow = colWidths
            .map(width => "-".repeat(width + 2))
            .join("|");
          describeStr += sepRow + "\n";
        }
      });

      // Simple summaries for numeric fields
      const summaries = {};
      meta.fields.forEach(field => {
        const colData = data.map(row => row[field]).filter(val => typeof val === 'number');
        if (colData.length > 0) {
          const count = colData.length;
          const sum = colData.reduce((acc, val) => acc + val, 0);
          const avg = (sum / count).toFixed(2);
          summaries[field] = { count, avg };
        }
      });

      // Output
      let text = '';
      text += `File Name: ${file.name}\n`;
      text += `File Size: ${(file.size / (1024 * 1024)).toFixed(2)} MB\n`;
      text += `Rows: ${numRows}, Columns: ${numCols}\n`;
      text += `Missing Values: ${numMissing}\n\n`;
      text += `${describeStr}\n`;
      text += `Summaries:\n`;
      for (const field in summaries) {
        text += `${field}: Count = ${summaries[field].count}, Avg = ${summaries[field].avg}\n`;
      }
      output.textContent = text;
    } catch (err) {
      output.textContent = `Error: ${err.message}`;
    }
  };

  reader.onerror = function(e) {
    clearInterval(interval);
    output.textContent = "Failed to read file.";
  };

  reader.readAsText(file);
});

// Compute descriptive statistics (same logic as before, browser version)
function computeDescriptiveStats(data, fields) {
  let stats = {};
  fields.forEach(field => {
    const colData = data.map(row => row[field]).filter(val => val !== null && val !== undefined && val !== '');
    if (colData.length === 0) {
      stats[field] = {
        count: 0, unique: "NaN", top: "NaN", freq: "NaN",
        mean: NaN, std: NaN, min: NaN, '25%': NaN, '50%': NaN, '75%': NaN, max: NaN
      };
      return;
    }
    if (typeof colData[0] === 'number') {
      const numericData = colData;
      const count = numericData.length;
      const mean = numericData.reduce((sum, x) => sum + x, 0) / count;
      const std = Math.sqrt(numericData.reduce((sum, x) => sum + Math.pow(x - mean, 2), 0) / count);
      const min = Math.min(...numericData);
      const max = Math.max(...numericData);
      const sorted = numericData.slice().sort((a, b) => a - b);
      const quantile = (q) => {
        const pos = (sorted.length - 1) * q;
        const base = Math.floor(pos);
        const rest = pos - base;
        if (sorted[base + 1] !== undefined) {
          return sorted[base] + rest * (sorted[base + 1] - sorted[base]);
        } else {
          return sorted[base];
        }
      };
      const q25 = quantile(0.25);
      const q50 = quantile(0.5);
      const q75 = quantile(0.75);
      stats[field] = {
        count: count,
        unique: NaN,
        top: NaN,
        freq: NaN,
        mean: mean,
        std: std,
        min: min,
        '25%': q25,
        '50%': q50,
        '75%': q75,
        max: max
      };
    } else {
      // For non-numeric columns
      const count = colData.length;
      const uniqueVals = {};
      colData.forEach(val => {
        uniqueVals[val] = (uniqueVals[val] || 0) + 1;
      });
      const uniqueCount = Object.keys(uniqueVals).length;
      let topValue = null;
      let topFreq = 0;
      for (const key in uniqueVals) {
        if (uniqueVals[key] > topFreq) {
          topValue = key;
          topFreq = uniqueVals[key];
        }
      }
      stats[field] = {
        count: count,
        unique: uniqueCount,
        top: topValue,
        freq: topFreq,
        mean: NaN,
        std: NaN,
        min: NaN,
        '25%': NaN,
        '50%': NaN,
        '75%': NaN,
        max: NaN
      };
    }
  });
  return stats;
}
