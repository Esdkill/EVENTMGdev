// The red and green channels bend the backdrop horizontally and vertically.
// Both maps are neutral in the centre, so the distortion stays around the rim.
function displacementMap(axis: "x" | "y") {
  const stops = [[0, "fc"], [4, "df"], [12, "80"], [88, "80"], [96, "21"], [100, "04"]] as const;
  const gradient = stops.map(([offset, value]) =>
    `<stop offset="${offset}%" stop-color="${axis === "x" ? "#" + value + "0000" : "#00" + value + "00"}"/>`
  ).join("");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><defs><linearGradient id="edge" ${axis === "y" ? 'x2="0%" y2="100%"' : ""}>${gradient}</linearGradient></defs><rect width="100%" height="100%" fill="url(#edge)"/></svg>`;
  return "data:image/svg+xml," + encodeURIComponent(svg);
}

const horizontal = displacementMap("x");
const vertical = displacementMap("y");

export function GlassRefraction() {
  return <svg aria-hidden="true" focusable="false" className="glass-filter" width="0" height="0">
    <defs>
      <filter id="cabinet-refraction" x="0%" y="0%" width="100%" height="100%" colorInterpolationFilters="sRGB">
        <feImage href={horizontal} preserveAspectRatio="none" result="horizontal" />
        <feImage href={vertical} preserveAspectRatio="none" result="vertical" />
        <feBlend in="horizontal" in2="vertical" mode="screen" result="displacement" />
        <feDisplacementMap in="SourceGraphic" in2="displacement" scale="14" xChannelSelector="R" yChannelSelector="G" />
      </filter>
    </defs>
  </svg>;
}
