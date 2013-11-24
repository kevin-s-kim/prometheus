function RobotArm(viewModel)
{
	var self = this;
	
	self.viewModel = viewModel;

	self.container = $('#3d-prometheus-container');
	self.width = 970;
	self.height = 500;
	
	self.cameraIterator = 0;
	self.cameraDistance = 750;

	self.mesh = {};
	self.meshesToLoad = 0;
	self.meshesLoaded = 0;
	
	// Methods
	self.init = function()
	{
		// Enable auto-resizing of the renderer canvas
		self.startAutoResize();
		
		// Camera
		self.camera = new THREE.PerspectiveCamera(45, self.width / self.height, 0.1, 10000);
		self.camera.position.z = self.cameraDistance;
		self.camera.position.y = 300;

		// Scene
		self.scene = new THREE.Scene();

		// Renderer
		self.renderer = new THREE.WebGLRenderer();
		self.renderer.setSize(self.width, self.height);

		self.container.get(0).appendChild(self.renderer.domElement);

		// Material
		self.material =
			new THREE.MeshLambertMaterial(
			{
				color: 0xCC0000
			});

		// First Light
		var light = new THREE.PointLight(0xFFFFFF);

		light.position.x = 0;
		light.position.z = self.cameraDistance;
		light.position.y = self.cameraDistance * 1.5;
		self.scene.add(light);
		
		// Second Light
		light = light.clone();
		light.position.z = -self.cameraDistance;
		self.scene.add(light);
		
		// Ground Plane
		self.ground = new THREE.Mesh(new THREE.PlaneGeometry(5000, 5000, 40, 40), new THREE.MeshBasicMaterial({ wireframe: true, color: 0x999999 }));
		self.ground.rotation.x = Math.PI / 2;
		self.scene.add(self.ground);

		// Init STL Loader
		self.loader = new THREE.STLLoader();

		self.loader.addEventListener('load', function(event)
		{
			var geometry = event.content;
			var mesh = new THREE.Mesh(geometry, self.material);
			mesh.name = geometry.name;

			self.mesh[mesh.name] = mesh;
			
			self.meshesLoaded += 1;
			
			if(self.meshesLoaded == self.meshesToLoad)
			{
				self.loadingComplete();
			}
		});

		// Load STL Files
		self.meshesToLoad = 2;
		
		self.loader.load('./models/torso.stl');
		self.loader.load('./models/humerus.stl');
	}
	
	self.startAutoResize = function()
	{
		window.addEventListener('resize', self.autoResizeCallback, false);
	}
	
	self.stopAutoResize = function()
	{
		window.removeEventListener('resize', self.autoResizeCallback);
	}
	
	self.autoResizeCallback = function()
	{
		self.renderer.setSize(self.container.width(), self.container.height());
		
		self.camera.aspect = self.container.width() / self.container.height();
		self.camera.updateProjectionMatrix();
	}
	
	self.addLine = function(parent, start, end)
	{
		// Line width doesn't work on windows
		var material = new THREE.LineBasicMaterial({linewidth: 3, color: 0x00FF00});
		
		var geometry = new THREE.Geometry;
		geometry.vertices.push(start);
		geometry.vertices.push(end);
		
		parent.add(new THREE.Line(geometry, material));
	}
	
	self.loadingComplete = function()
	{
		// Add torso to scene
		self.scene.add(self.mesh['torso']);
		
		// Move the axis of rotation for the torso to the center of it's base
		// Torso Bounding box size: ~152.36, ~325.48, ~152.40
		self.mesh['torso'].geometry.computeBoundingBox();
		var bb = self.mesh['torso'].geometry.boundingBox;
		var offset = new THREE.Vector3();
		offset.addVectors(bb.min, bb.max);
		offset.multiplyScalar(-0.5);
		self.mesh['torso'].geometry.applyMatrix(new THREE.Matrix4().makeTranslation(offset.x, 0, offset.z));
		self.mesh['torso'].geometry.computeBoundingBox();
		
		// Add humerus to torso
		self.mesh['torso'].add(self.mesh['humerus']);
		
		// Move the axis of rotation for the humerus
		// Humerus Bounding Box Size: ~114.30, ~352.95, ~217.95
		self.mesh['humerus'].geometry.applyMatrix(new THREE.Matrix4().makeTranslation(-57.15, -328, -193));
		self.mesh['humerus'].geometry.computeBoundingBox();
		
		// Move humerus to the correct position
		// The axis for jointing the torso to the humerus is 281 up from the center of torso
		self.mesh['humerus'].position.y = 281;
		
		// Add lines for axes of rotation
		self.addLine(self.scene, new THREE.Vector3(0, -75, 0), new THREE.Vector3(0, 75, 0));
		self.addLine(self.mesh['torso'], new THREE.Vector3(100, 281, 0), new THREE.Vector3(-100, 281, 0));
		self.addLine(self.mesh['humerus'], new THREE.Vector3(100, -290, -135), new THREE.Vector3(-100, -290, -138));

		console.log('Loading complete!');
		
		// Start the animation
		self.animate();	
	}
	
	self.animate = function()
	{
		requestAnimationFrame(self.animate);
		
		// Move meshes according to the range inputs
		self.mesh['torso'].rotation.y = self.viewModel.joints()[0].setPoint() / 180 * Math.PI;
		self.mesh['humerus'].rotation.x = self.viewModel.joints()[1].setPoint() / 180 * Math.PI;
		
		// Rotate camera around 0,300,0
		self.cameraIterator += 0.01;
		self.camera.position.x = Math.sin(self.cameraIterator) * self.cameraDistance;
		self.camera.position.z = Math.cos(self.cameraIterator) * self.cameraDistance;
		self.camera.lookAt(new THREE.Vector3(0, 300, 0));
		
		self.renderer.render(self.scene, self.camera);
	}
}
