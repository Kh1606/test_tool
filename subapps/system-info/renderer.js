function getGPUInfo() {
  try {
    const canvas = document.createElement("canvas");
    const gl = canvas.getContext("webgl") || canvas.getContext("experimental-webgl");
    if (!gl) return "Not available";
    const debugInfo = gl.getExtension("WEBGL_debug_renderer_info");
    if (debugInfo) {
      return gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
    }
    return "Not available";
  } catch (e) {
    return "Not available";
  }
}

document.getElementById("infoButton").addEventListener("click", () => {
  const company = document.getElementById("company").value;
  const testPeriod = document.getElementById("testPeriod").value;
  const examinee = document.getElementById("examinee").value;

  // Gather browser-detectable system info
  const os = window.navigator.userAgentData
    ? window.navigator.userAgentData.platform
    : window.navigator.platform;
  const browser = window.navigator.userAgent;
  const deviceMemory = navigator.deviceMemory
    ? navigator.deviceMemory + " GB"
    : "Not available";
  const cpuCores = navigator.hardwareConcurrency
    ? navigator.hardwareConcurrency
    : "Not available";
  const screenRes = `${window.screen.width}x${window.screen.height}`;
  const gpu = getGPUInfo();

  document.getElementById("infoDisplay").innerHTML = `
    <h3>System Info</h3>
    <p><strong>Company:</strong> ${company}</p>
    <p><strong>Test Period:</strong> ${testPeriod}</p>
    <p><strong>Examiner:</strong> ${examinee}</p>
    <p><strong>OS/Platform:</strong> ${os}</p>
    <p><strong>Browser:</strong> ${browser}</p>
    <p><strong>Device RAM:</strong> ${deviceMemory}</p>
    <p><strong>CPU Cores:</strong> ${cpuCores}</p>
    <p><strong>Screen Resolution:</strong> ${screenRes}</p>
    <p><strong>GPU:</strong> ${gpu}</p>
    <p style="color:#888;font-size:13px">(Browser-based info. For full hardware details, use the desktop version.)</p>
  `;
});
