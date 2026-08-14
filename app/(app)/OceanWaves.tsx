export default function OceanWaves() {
  return (
    <div className="ocean-container">
      <svg
        className="ocean-svg"
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 1200 50"
        preserveAspectRatio="none"
      >
        <defs>
          <path id="ocean-wave-1" d="M0,15 C90,-5 140,25 230,10 C320,-5 360,30 470,10 C540,0 570,20 600,15 C700,-5 740,25 830,10 C920,-5 960,30 1070,10 C1140,0 1170,20 1200,15 V100 H0 Z" />
          <path id="ocean-wave-2" d="M0,28 C80,10 120,38 210,18 C280,2 330,40 420,15 C490,2 530,35 600,28 C680,10 720,38 810,18 C880,2 930,40 1020,15 C1090,2 1130,35 1200,28 V100 H0 Z" />
          <path id="ocean-wave-3" d="M0,20 C110,0 130,35 220,22 C300,10 350,-2 460,15 C520,28 570,8 600,20 C710,0 730,35 820,22 C900,10 950,-2 1060,15 C1120,28 1170,8 1200,20 V100 H0 Z" />
          <path id="ocean-wave-4" d="M0,32 C90,12 120,42 230,22 C310,5 370,38 470,15 C530,2 570,35 600,32 C690,12 720,42 830,22 C910,5 970,38 1070,15 C1130,2 1170,35 1200,32 V100 H0 Z" />
          <path id="ocean-wave-5" d="M0,24 C80,2 120,35 210,8 C300,-8 350,30 460,5 C520,-4 570,28 600,24 C680,2 720,35 810,8 C900,-8 950,30 1060,5 C1120,-4 1170,28 1200,24 V100 H0 Z" />
        </defs>

        <g className="wave-group wave-layer-1">
          <use href="#ocean-wave-1" y="0" fill="rgba(223, 218, 203, 0.25)" />
        </g>
        <g className="wave-group wave-layer-2">
          <use href="#ocean-wave-2" y="5" fill="rgba(223, 218, 203, 0.45)" />
        </g>
        <g className="wave-group wave-layer-3">
          <use href="#ocean-wave-3" y="10" fill="rgba(223, 218, 203, 0.65)" />
        </g>
        <g className="wave-group wave-layer-4">
          <use href="#ocean-wave-4" y="15" fill="rgba(223, 218, 203, 0.85)" />
        </g>
        <g className="wave-group wave-layer-5">
          <use href="#ocean-wave-5" y="20" fill="#DFDACB" />
        </g>
      </svg>
    </div>
  );
}