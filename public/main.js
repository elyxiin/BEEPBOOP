// Import Three.js and GLTFLoader
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'https://cdn.jsdelivr.net/npm/three@0.171.0/examples/jsm/controls/OrbitControls.js';

// Basic setup of Three.js scene, camera, and renderer
const scene = new THREE.Scene();

const width = window.innerWidth;
const height = window.innerHeight;

let camera = new THREE.PerspectiveCamera(
  75,
  width / height,
  0.1,
  1000
); // fov, ratio, near, far

// cameras
let kitchenCamera = null;
let exteriorCamera = null;
let garageCamera = null;

// Update the projection matrix for the initial aspect ratio
camera.updateProjectionMatrix();

const renderer = new THREE.WebGLRenderer({
  antialias: true,
  logarithmicDepthBuffer: true,
});
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// for Orbital Controls later
let controls;

// Creates a canvas to generate a gradient texture
const canvas = document.createElement('canvas');
canvas.width = 512;
canvas.height = 512;
const ctx = canvas.getContext('2d');

// Create a gradient 
const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
gradient.addColorStop(0, '#333D91');
gradient.addColorStop(1, '#B1BBD9'); 

// Applies the gradient to the entire canvas
ctx.fillStyle = gradient;
ctx.fillRect(0, 0, canvas.width, canvas.height);

// Creates a texture from the canvas
const texture = new THREE.CanvasTexture(canvas);

// Creates a large sphere to act as a skybox
const material = new THREE.MeshBasicMaterial({
  map: texture,
  side: THREE.BackSide 
});
const geometry = new THREE.SphereGeometry(600, 60, 60);
const skybox = new THREE.Mesh(geometry, material);

// Set the scene background to the skybox
scene.add(skybox);       


// loads the GLTF model
const loader = new GLTFLoader();
loader.load(
  './models/NetZeroHomeV0.4.gltf', 
  (gltf) => {

    gltf.scene.traverse((child) => {
      if (child.isMesh) {
        const material = child.material;
        // manual fix for render order
        if (child.isMesh && 
          child.name === 'K_wallKitchen' 
          || child.name === 'k_cabinetFullBack'
          || child.name === 'K_counterTop'
          || child.name === 'EX_roof'
          || child.name === 'EX_brickWalls'
          || child.name === 'G_waterHeater'
          || child.name.startsWith('G_car')
          ) 
        {
          // more fixes for rendering order of specific objects
          child.renderOrder = -20;
          material.depthWrite = true; 
          material.depthTest = true; 
        } else if (
          child.name === 'EXG_stoneWall1'
          || child.name === 'EXG_stoneWall2'
          || child.name === 'EXG_stoneWall3'
          || child.name === 'EX_brickWallBack'
          || child.name === 'EX_heatPump'
          || child.name === 'EX_backRoof'
        ) 
        {
          child.renderOrder = -10;
        } else if (
          child.name === '' // potentially need???
        ) 
        {
          child.renderOrder = 1000;
        }
        else if (material && material.transparent) {
          // transparent objects are sorted from back to front based on the distance to the camera
          child.renderOrder = camera.position.distanceToSquared(child.position);
          material.depthWrite = false; 
          material.depthTest = true;   
        } else {
          // opaque objects render first
          child.renderOrder = 0;
          material.depthWrite = true; 
          material.depthTest = true;  
        }
      }
    });


    // camera values
    kitchenCamera = gltf.cameras.find((camera) => camera.name === 'KLV_camera');
    exteriorCamera = gltf.cameras.find((camera) => camera.name === 'EX_camera');
    garageCamera = gltf.cameras.find((camera) => camera.name === 'G_camera');

    // adds loaded model
    scene.add(gltf.scene);
    
    // initializes Orbit Controls
    controls = new OrbitControls(camera,renderer.domElement);

    // limits for rotation
    controls.minPolarAngle = Math.PI / 4; // lower limit (vertical, 45°)
    controls.maxPolarAngle = Math.PI / 2; // upper limit (vertical, 90°)
    controls.minAzimuthAngle = -Math.PI / 4; // left limit (horizontal, -45°)
    controls.maxAzimuthAngle = Math.PI / 4; // right limit (horizontal, 45°)

    // other configurations
    controls.enableDamping = true; // smooth rotation
    controls.dampingFactor = 0.05;

    controls.enableZoom = true;
    controls.minDistance = 5.0;
    controls.maxDistance = 50.0;

    controls.enablePan = false; 


    // starts loop
    animate();

    // -------- menu buttons -------- //
    // turn on button
    document.getElementById('turnOn').addEventListener('click', () => {
      document.querySelector('.menu-screen').style.display = 'none';
      camera.copy(exteriorCamera);

    });

    // turn off button
    document.getElementById('turnOff').addEventListener('click', () => {
      document.querySelector('.menu-screen').style.display = 'none';
      camera.copy(exteriorCamera);
    });

  },

  // if it fails to load
  undefined,
  (error) => {
    console.error('Error loading GLTF model:', error);
  }
);

// =================== functions =================== //

// function to animate the scene
function animate() {
  requestAnimationFrame(animate);

  // checks for controls and then updates
  if (controls) controls.update();
  renderer.render(scene, camera);

}

// update to properly resize the screen
window.addEventListener('resize', () => {
  const width = window.innerWidth;
  const height = window.innerHeight;

  renderer.setSize(width, height);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();

});

function getObjectsByName(scene, name) {
  const objects = [];
  scene.traverse((child) => {
    if (child.isMesh && child.name === name) {

      const material = child.material;
      if (material) {
        material.depthTest = true;  
      }

      objects.push(child);
    } else if(child.name === name) {
      objects.push(child);
    }
  });
  return objects;
}

function getObjectsByPrefix(scene, prefix) {
  const objectsWithPrefix = [];

  scene.traverse((child) => {
    if (child.isMesh && child.name.startsWith(prefix)) {
      objectsWithPrefix.push(child.name);  
    }
  });
  return objectsWithPrefix;
}

// sets visibility by name, scene (can include multiple names if in array), and true/false value
function setVisibility(scene, names, visibility) {
  scene.traverse((child) => {
    if (child.isMesh && names.includes(child.name)) {
      child.visible = visibility; 
    }
  });
}

function changeCamera(newCamera) {
  if (!newCamera) {
    console.error("Error: newCamera is undefined or null.");
    return;
  }

  camera = newCamera;

  // updates OrbitControls
  if (controls) {
      controls.object = camera;
      controls.update();
  }

  updateButtonVisibility();
}

// =================== raycasting setup / info =================== //

let exteriorFlag = true; // flag for if the exterior is on
let ovenFlag = false; // flag for if oven raycasting can work
let kitchenFlag = false; // flag for if in kitchen

const raycaster = new THREE.Raycaster();

// pop up system html
const popup = document.getElementById('popup');
const popupText = document.getElementById('popupText');
const closePopup = document.getElementById('closePopup');
const popupTitle = document.getElementById('popupTitle');
const nextButton = document.getElementById('nextButton');
const prevButton = document.getElementById('prevButton');
let isPopupVisible = false;
let currentPageIndex = 0;
let popupMessages = {};

// Fetch external text data from the text.json file
fetch('text.json')
  .then(response => response.json())
  .then(data => {
    popupMessages = data;
  })
  .catch(error => console.error('Error loading popup text:', error));

function showPopup(content, sequence = null) {
   if (typeof content === "object" && content !== null) {
   popupTitle.innerText = content.title || "Popup";
   popupMessages = content.sequence || [];
  } else {
   popupTitle.innerText = "Popup";
   popupMessages = sequence || [content];
  }

  currentPageIndex = 0;
  
   if (popupMessages.length > 0) {
     renderSequencePage();
   } else {
     popupText.innerText = "No content available.";
     toggleNavigationButtons(false, false);
   }
  
    popup.style.display = 'block';
    document.getElementById('three-canvas').style.pointerEvents = 'none';
    isPopupVisible = true;

}

// renders the current page of a sequence
function renderSequencePage() {
  popupText.innerText = popupMessages[currentPageIndex];

  const hasPrev = currentPageIndex > 0;
  const hasNext = currentPageIndex < popupMessages.length - 1;

  toggleNavigationButtons(hasPrev, hasNext);
}

// toggles the navigation buttons
function toggleNavigationButtons(showPrev, showNext) {
  prevButton.style.display = showPrev ? 'inline-block' : 'none';
  nextButton.style.display = showNext ? 'inline-block' : 'none';
}

// next button
nextButton.addEventListener('click', () => {
  if (currentPageIndex < popupMessages.length - 1) {
    currentPageIndex++;
    renderSequencePage();
  }
});

// back button
prevButton.addEventListener('click', () => {
  if (currentPageIndex > 0) {
    currentPageIndex--;
    renderSequencePage();
  }
});

// hides the popup and enable 3D scene interaction
function hidePopup() {
  popup.style.display = 'none';
  document.getElementById('three-canvas').style.pointerEvents = 'auto';
  isPopupVisible = false;
  if(!exteriorFlag&&!ovenFlag&&kitchenFlag){
    ovenFlag = true;
  }
}

closePopup.addEventListener('click', (event) => {
  event.stopPropagation();
  hidePopup();
});


document.addEventListener('click', onClick);

function onClick(event){

  const coords = new THREE.Vector2(
    (event.clientX / renderer.domElement.clientWidth)*2 - 1,
    -((event.clientY / renderer.domElement.clientHeight)*2 - 1),
  );

  raycaster.setFromCamera(coords, camera);

    if(!(camera === exteriorCamera)){
      toggleReturnButton(true);
    } else {
      toggleReturnButton(false);
    }

   // window intersections
   const windowIntersections = raycaster.intersectObjects(getObjectsByName(scene,'EXLV_mainWinStainedGlass'), true);
    if(windowIntersections.length > 0&&exteriorFlag){
      
      const notKLR = getObjectsByPrefix(scene, "G").concat(getObjectsByPrefix(scene, "EX"));
      setVisibility(scene,notKLR,false);
      exteriorFlag = false;
      ovenFlag = true;
      kitchenFlag=true;
      changeCamera(kitchenCamera);

     }

   // oven intersections
   const intersections = raycaster.intersectObjects(getObjectsByName(scene, 'K_Oven'), true);
   if (intersections.length > 0 && ovenFlag) {
     if (!isPopupVisible) {
       showPopup(popupMessages.oven);
       ovenFlag = false; 
     }
   }


   // garage door intersections
   const gDoorIntersections = raycaster.intersectObjects(getObjectsByName(scene,'EXG_bigDoor'), true);
    if(gDoorIntersections.length > 0&&(exteriorFlag)){

      const notGarage = getObjectsByPrefix(scene, "K").concat(getObjectsByPrefix(scene, "LR")).concat(getObjectsByPrefix(scene, "EX"));
      setVisibility(scene,notGarage,false);
      exteriorFlag = false;
      changeCamera(garageCamera);
     
     }

    updateButtonVisibility();

}

// return button time
const returnButton = document.getElementById('return');


function toggleReturnButton(isVisible) {
  returnButton.style.display = isVisible ? 'block' : 'none';
}

function updateButtonVisibility() {
  // Check if the current camera is the exterior camera
  const isExteriorView = camera === exteriorCamera;
  toggleReturnButton(!isExteriorView); // Show the return button if not exterior camera
}

function clickReturnButton(callback) {
  returnButton.addEventListener('click', () => {
    if (typeof callback === 'function') {
      callback();
    }
  });
}

clickReturnButton(() => {
  changeCamera(exteriorCamera); // Return to the exterior camera
  ovenFlag = false;
  kitchenFlag = false;
  exteriorFlag = true;
  setVisibility(scene, getObjectsByPrefix(scene,""), true);
  toggleReturnButton(false);
});


