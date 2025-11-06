import * as THREE from "three";
import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import "./index.css";
import MapViewerApp from "./mapviewer/MapViewerApp";
import reportWebVitals from "./reportWebVitals";
import { Bzip2 } from "./rs/compression/Bzip2";
import { Gzip } from "./rs/compression/Gzip";

// Make THREE global
(window as any).THREE = THREE;

Bzip2.initWasm();
Gzip.initWasm();

window.wallpaperPropertyListener = {
  applyGeneralProperties: (properties: any) => {
    if (properties.fps) {
      (window as any).wallpaperFpsLimit = properties.fps;
    }
  },
};

const root = ReactDOM.createRoot(
  document.getElementById("root") as HTMLElement
);

root.render(
  // <React.StrictMode>
  <BrowserRouter>
    <MapViewerApp />
  </BrowserRouter>
  // </React.StrictMode>
);

reportWebVitals();
