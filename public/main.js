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
  './public/models/NetZeroHomeV1.0.gltf', 
  (gltf) => {

    gltf.scene.traverse((child) => {
      if (child.isMesh) {
        const material = child.material;
        // manual fix for render order
        if (child.isMesh && 
          child.name === 'K_wallKitchen' 
          || child.name === 'K_cabinetFullBack'
          || child.name === 'K_counterTop'
          || child.name === 'EX_roof'
          || child.name === 'EX_brickWalls'
          || child.name === 'G_waterHeater'
          || child.name.startsWith('G_car')
          || child.name === 'EXG_stone'
          || child.name === 'EXG_stoneWall1'
          || child.name === 'EXG_stoneWall2'
          || child.name === 'EXG_stoneWall3'
          ) 
        {
          // more fixes for rendering order of specific objects
          child.renderOrder = -20;
          material.depthWrite = true; 
          material.depthTest = true; 
        } else if (
          
           child.name === 'EX_brickWallBack'
          || child.name === 'EX_heatPump'
          || child.name === 'EX_backRoof'
        ) 
        {
          child.renderOrder = 10;
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
          child.renderOrder = -200;
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
      menuFlag = true;
      setVisibility(scene, ['K_gasStove'], false);


    });

    // turn off button
    document.getElementById('turnOff').addEventListener('click', () => {
      document.querySelector('.menu-screen').style.display = 'none';
      camera.copy(exteriorCamera);
      setVisibility(scene, ['K_gasStove'], false);
      // menuFlag = false;
      // setVisibility(scene, ['K_Oven'], false);
    });

  },

  // if it fails to load
  undefined,
  (error) => {
    console.error('Error loading GLTF model:', error);
  }
);

 // true = turn on button clicked
 // false = turn off button clicked
let menuFlag = null;

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
let garageFlag = false; // flag for garage

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

let initialPopupMessages = {}; // without it, popup messages kept clearing

fetch('text.json')
  .then(response => response.json())
  .then(data => {
    popupMessages = { ...data };
    initialPopupMessages = { ...data }; 
  })
  .catch(error => console.error('Error loading popup text:', error))

function showPopup(content, sequence = null) {
  if (typeof content === "object" && content !== null) {
    popupTitle.innerText = content.title || "Popup";
    popupMessages = Array.isArray(content.sequence) ? [...content.sequence] : [];
  } else {
    popupTitle.innerText = "Popup";
    popupMessages = sequence ? [...sequence] : [content];
  }

  if (popupMessages.length > 0) {
    currentPageIndex = 0; 
    renderSequencePage();
  } else {
    popupText.innerText = "No content available.";
    toggleNavigationButtons(false, false);
  }

  popup.style.display = "block";
  document.getElementById("three-canvas").style.pointerEvents = "none";
  isPopupVisible = true;
}

// renders the current page of a sequence
function renderSequencePage() {
  popupText.innerHTML = popupMessages[currentPageIndex];

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

  currentPageIndex = 0;

  // fix for clearing of fetched data
  popupMessages = initialPopupMessages;
}

closePopup.addEventListener('click', (event) => {
  event.stopPropagation();
  hidePopup();
});

// the car has many parts so I made a function specifically for the array of many parts
let carFlag = false;
let carCount = 0;
function isIntersecting(part) {
   const intersections = raycaster.intersectObjects(getObjectsByName(scene, part), true);
   if (intersections.length > 0) {
       carCount++;
   }
}

// clicking on objects to activate pop-ups or move rooms
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
  const ovenIntersections = raycaster.intersectObjects(getObjectsByName(scene, 'K_Oven'), true);
  if (ovenIntersections.length > 0) {
    if (!isPopupVisible&&menuFlag) {
    currentPageIndex = 0;
      showPopup(popupMessages.oven);
      ovenFlag = false; 
    }
  }

  // garage door intersections
  const gDoorIntersections = raycaster.intersectObjects(getObjectsByName(scene,'EXG_bigDoor'), true);
  if(gDoorIntersections.length > 0&&(exteriorFlag)){

    const notGarage = getObjectsByPrefix(scene, "K").concat(getObjectsByPrefix(scene, "LR")).concat(getObjectsByPrefix(scene, "EX"));
    setVisibility(scene,notGarage,false);
    setVisibility(scene, getObjectsByPrefix(scene,"EXG_stoneWall3"),true)
    exteriorFlag = false;
    garageFlag = true;
    changeCamera(garageCamera);
    
    }

  // hybrid water heater intersections
   const waterIntersections = raycaster.intersectObjects(getObjectsByName(scene, 'G_waterHeater'), true);
   if (waterIntersections.length > 0) {
     if (!isPopupVisible&&menuFlag&&garageFlag) {
       currentPageIndex = 0;
       showPopup(popupMessages.water);
     }
   }

  // heat pump outdoors intersections
  const hpIntersections = raycaster.intersectObjects(getObjectsByName(scene, 'EX_heatPump'), true);
  if (hpIntersections.length > 0) {
    if (!isPopupVisible&&menuFlag&&exteriorFlag) {
      currentPageIndex = 0;
      showPopup(popupMessages.airSourceHP);
    }
  }

  // electric pole intersections
  const epIntersections = raycaster.intersectObjects(getObjectsByName(scene, 'EX_electricPole'), true);
  if (epIntersections.length > 0) {
    if (!isPopupVisible&&menuFlag&&exteriorFlag) {
      currentPageIndex = 0;
      showPopup(popupMessages.grid);
    }
  }
  // solar panel intersections
  const spIntersections = raycaster.intersectObjects(getObjectsByName(scene, 'EX_solarPanels'), true);
  if (spIntersections.length > 0) {
    if (!isPopupVisible&&menuFlag&&exteriorFlag) {
      currentPageIndex = 0;
      showPopup(popupMessages.sPanels);
    }
  }

  //car intersections
  const car = getObjectsByPrefix(scene,"G_car", true);
  car.forEach(isIntersecting);
  if (carCount>0){
      carFlag = true;
    } else {
      carFlag = false;
    }
    
  if (carFlag) {
    if (!isPopupVisible&&garageFlag) {
        currentPageIndex = 0;
        showPopup(popupMessages.ev);
      }
    }
    carCount = 0;
    updateButtonVisibility();
}

const clickableObjects = [
  getObjectsByName(scene, 'EXLV_mainWinStainedGlass'),
  getObjectsByName(scene, 'K_Oven'),
  getObjectsByName(scene, 'EXG_bigDoor'),
  getObjectsByName(scene, 'G_waterHeater'),
  getObjectsByName(scene, 'EX_heatPump')
];

document.addEventListener('mousemove', onMouseMove);

// flags for pointer hovering
let wPointFlag = false;
let oPointFlag = false;
let gPointFlag = false;
let hwhPointFlag = false;
let hpoPointFlag = false;
let epPointFlag = false;
let spPointFlag = false;
let evPointFlag = false;

function onMouseMove(event) {
  const coords = new THREE.Vector2(
    (event.clientX / renderer.domElement.clientWidth)*2 - 1,
    -((event.clientY / renderer.domElement.clientHeight)*2 - 1),
  );

  raycaster.setFromCamera(coords, camera);
    
    // window intersections
    const windowIntersections = raycaster.intersectObjects(getObjectsByName(scene,'EXLV_mainWinStainedGlass'), true);
    if(windowIntersections.length > 0&&exteriorFlag){
      wPointFlag = true;
    } else {
      wPointFlag = false;
    }
    
    // oven intersections
    const ovenIntersections = raycaster.intersectObjects(getObjectsByName(scene, 'K_Oven'), true);
    if (ovenIntersections.length > 0) {
      oPointFlag = true;
    } else {
      oPointFlag = false;
    }
  
    // garage door intersections
    const gDoorIntersections = raycaster.intersectObjects(getObjectsByName(scene,'EXG_bigDoor'), true);
    if(gDoorIntersections.length > 0&&(exteriorFlag)){
      gPointFlag = true;
    } else {
      gPointFlag = false;
    }
  
    // hybrid water heater intersections
    const waterIntersections = raycaster.intersectObjects(getObjectsByName(scene, 'G_waterHeater'), true);
    if (waterIntersections.length > 0) {
      hwhPointFlag = true;
    } else {
      hwhPointFlag = false;
    }
  
    // heat pump outdoors intersections
    const hpIntersections = raycaster.intersectObjects(getObjectsByName(scene, 'EX_heatPump'), true);
    if (hpIntersections.length > 0&&exteriorFlag) {
      hpoPointFlag = true;
    } else {
      hpoPointFlag = false;
    }

    // electric pole intersections
    const epIntersections = raycaster.intersectObjects(getObjectsByName(scene, 'EX_electricPole'), true);
    if (epIntersections.length > 0) {
      if (!isPopupVisible&&menuFlag){
        epPointFlag = true;
      } else {
        epPointFlag = false;
      }
    }

    // solar panel intersections
    const spIntersections = raycaster.intersectObjects(getObjectsByName(scene, 'EX_solarPanels'), true);
    if (spIntersections.length > 0) {
      if (!isPopupVisible&&menuFlag) {
        spPointFlag = true;
      } else {
        spPointFlag = false;
      }
    }

    // car intersections
    const car = getObjectsByPrefix(scene,"G_car", true);
    car.forEach(isIntersecting);
    if (carCount>0){
        carFlag = true;
      } else {
        carFlag = false;
      }
    
    if (carFlag) {
      if (!isPopupVisible&&garageFlag) {
        evPointFlag = true;
      } else {
        evPointFlag = false;
        }
      }
    carCount = 0;

    
       
  
    
      if(wPointFlag||oPointFlag||gPointFlag||hwhPointFlag||hpoPointFlag||evPointFlag){
        document.body.style.cursor = 'pointer';
      } else {
        document.body.style.cursor = 'default';
      }
    
}



// =========================== return button time =========================== //
const returnButton = document.getElementById('return');


function toggleReturnButton(isVisible) {
  returnButton.style.display = isVisible ? 'block' : 'none';
}

function updateButtonVisibility() {
  const isExteriorView = camera === exteriorCamera;
  toggleReturnButton(!isExteriorView);
}

function clickReturnButton(callback) {
  returnButton.addEventListener('click', () => {
    if (typeof callback === 'function') {
      callback();
    }
  });
}

clickReturnButton(() => {
  changeCamera(exteriorCamera); 
  ovenFlag = false;
  kitchenFlag = false;
  exteriorFlag = true;
  garageFlag = false;
  setVisibility(scene, getObjectsByPrefix(scene,""), true);
  toggleReturnButton(false);
});


