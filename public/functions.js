/* // =================== functions =================== //

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

  // update the renderer size
  renderer.setSize(width, height);

  // Update the camera aspect ratio and call .updateProjectionMatrix() to reapply the changes
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
});

function getObjectsByName(scene, name) {
  const objects = [];
  scene.traverse((child) => {
    if (child.isMesh && child.name === name) {

      // depth settings
      const material = child.material;
      if (material) {
        material.depthTest = true;   // Ensure depth testing is enabled
      }

      objects.push(child);
    }
  });
  return objects;
}

function switchCamera(activeCamera, newCamera) {
  activeCamera.copy(newCamera); 
  activeCamera.updateProjectionMatrix(); 
}
*/