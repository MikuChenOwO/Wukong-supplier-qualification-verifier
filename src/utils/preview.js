export const SAMPLE_PDF_DATA_URI =
  'data:application/pdf;base64,JVBERi0xLjQKJcTl8uXrp/Og0MTGCjEgMCBvYmoKPDwvVGl0bGUoV3Vrb25nIFByZXZpZXcpL1Byb2R1Y2VyKENvZGV4KS9DcmVhdGlvbkRhdGUoRDoyMDI2MDQyMzAwMDAwMCspPj4KZW5kb2JqCjIgMCBvYmoKPDwvVHlwZS9DYXRhbG9nL1BhZ2VzIDMgMCBSPj4KZW5kb2JqCjMgMCBvYmoKPDwvVHlwZS9QYWdlcy9Db3VudCAxL0tpZHNbNCAwIFJdPj4KZW5kb2JqCjQgMCBvYmoKPDwvVHlwZS9QYWdlL1BhcmVudCAzIDAgUi9NZWRpYUJveFswIDAgNTk1IDg0Ml0vQ29udGVudHMgNSAwIFIvUmVzb3VyY2VzPDwvRm9udDw8L0YxIDYgMCBSPj4+Pj4KZW5kb2JqCjUgMCBvYmoKPDwvTGVuZ3RoIDEwNz4+CnN0cmVhbQpCVCAvRjEgMjQgVGYgNzIgNzYwIFRkIChXdUtvbmcgTW9jayBQREYgUHJldmlldykgVGogMCAtMzYgVGQgL0YxIDE0IFRmIChVcGxvYWRlZCBmaWxlcyBhcmUgcHJldmlld2VkIGluLW1lbW9yeS4pIFRqIEVUCmVuZHN0cmVhbQplbmRvYmoKNiAwIG9iago8PC9UeXBlL0ZvbnQvU3VidHlwZS9UeXBlMS9CYXNlRm9udC9IZWx2ZXRpY2E+PgplbmRvYmoKeHJlZgowIDcKMDAwMDAwMDAwMCA2NTUzNSBmIAowMDAwMDAwMDEwIDAwMDAwIG4gCjAwMDAwMDAxMDkgMDAwMDAgbiAKMDAwMDAwMDE1OCAwMDAwMCBuIAowMDAwMDAwMjE0IDAwMDAwIG4gCjAwMDAwMDAzMjEgMDAwMDAgbiAKMDAwMDAwMDQ3NyAwMDAwMCBuIAp0cmFpbGVyCjw8L1Jvb3QgMiAwIFIvU2l6ZSA3Pj4Kc3RhcnR4cmVmCjU0OQolJUVPRgo='

export function createInlineImage(label, color = '#1f73d8') {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="960" height="560" viewBox="0 0 960 560">
      <defs>
        <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#f3f8ff"/>
          <stop offset="100%" stop-color="${color}33"/>
        </linearGradient>
      </defs>
      <rect width="960" height="560" rx="28" fill="url(#g)"/>
      <rect x="60" y="72" width="840" height="416" rx="24" fill="#ffffff" stroke="${color}" stroke-opacity="0.25"/>
      <text x="90" y="150" font-size="36" fill="#132238" font-family="Microsoft YaHei, sans-serif">${label}</text>
      <text x="90" y="210" font-size="20" fill="#0b3f8a" font-family="Microsoft YaHei, sans-serif">悟空 Mock 在线预览</text>
      <text x="90" y="270" font-size="18" fill="#5f7189" font-family="Microsoft YaHei, sans-serif">纯前端内存预览，无真实后端存储</text>
    </svg>
  `
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`
}
