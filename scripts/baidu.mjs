export const baiduHmSrc = "https://hm.baidu.com/hm.js?66da9f7560a573fa7d80f0c0506afaec";

const snippet = `<script>
var _hmt = _hmt || [];
(function() {
  if (location.hostname === "localhost" || location.hostname === "127.0.0.1" || location.hostname === "[::1]") return;
  var hm = document.createElement("script");
  hm.src = "${baiduHmSrc}";
  var s = document.getElementsByTagName("script")[0];
  s.parentNode.insertBefore(hm, s);
})();
</script>`;

export function injectBaiduAnalytics(html, label) {
  const parts = html.split("</head>");
  if (parts.length !== 2) {
    throw new Error(`${label} 缺少唯一的 </head>，百度统计要求放在 </head> 之前`);
  }
  if (html.includes(baiduHmSrc)) {
    throw new Error(`${label} 已经包含百度统计`);
  }
  const next = `${parts[0]}${snippet}\n</head>${parts[1]}`;
  const at = next.indexOf(baiduHmSrc);
  const head = next.indexOf("</head>");
  if (at < 0 || head < 0 || at > head) {
    throw new Error(`${label} 的百度统计没有落在 </head> 之前`);
  }
  if (next.split(baiduHmSrc).length - 1 !== 1) {
    throw new Error(`${label} 的百度统计出现了不止一次`);
  }
  return next;
}
