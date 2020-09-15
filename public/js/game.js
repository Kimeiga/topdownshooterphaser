var config = {
  type: Phaser.AUTO,
  parent: 'phaser-example',
  width: window.innerWidth,
  height: window.innerHeight,
  physics: {
    default: 'arcade',
    arcade: {
      debug: false,
      gravity: { y: 0 }
    }
  },
  scene: {
    preload: preload,
    create: create,
    update: update
  } 
};
 
var game = new Phaser.Game(config);
 
function preload() {
  this.load.image('ship', 'assets/playerShip1_blue.png');
  this.load.image('otherPlayer', 'assets/enemyBlack5.png');
  this.load.image('star', 'assets/star_gold.png');
  this.load.image('spacebg', 'assets/spacebg.jpg');
}
 
function create() {
  var self = this;

  // create an tiled sprite with the size of our game screen
  this.spacebg = this.add.tileSprite(0, 0, window.innerWidth, window.innerHeight, "spacebg");
  // Set its pivot to the top left corner
  this.spacebg.setOrigin(0, 0);
  // fixe it so it won't move when the camera moves.
  // Instead we are moving its texture on the update
  this.spacebg.setScrollFactor(0);
  this.socket = io();
  this.otherPlayers = this.physics.add.group();
  this.socket.on('currentPlayers', function (players) {
    Object.keys(players).forEach(function (id) {
      if (players[id].playerId === self.socket.id) {
        addPlayer(self, players[id]);
      } else {
        addOtherPlayers(self, players[id]);
      }
    });
  });
  this.socket.on('newPlayer', function (playerInfo) {
    addOtherPlayers(self, playerInfo);
  });
  this.socket.on('disconnect', function (playerId) {
    self.otherPlayers.getChildren().forEach(function (otherPlayer) {
      if (playerId === otherPlayer.playerId) {
        otherPlayer.destroy();
      }
    });
  });

  this.cursors = this.input.keyboard.createCursorKeys();

  this.socket.on('playerMoved', function (playerInfo) {
    self.otherPlayers.getChildren().forEach(function (otherPlayer) {
      if (playerInfo.playerId === otherPlayer.playerId) {
        otherPlayer.setRotation(playerInfo.rotation);
        otherPlayer.setPosition(playerInfo.x, playerInfo.y);
      }
    });
  });

  this.socket.on('starLocation', function (starLocation) {
    if (self.star) {
      self.star.destroy();
    }
    self.star = self.physics.add.sprite(starLocation.x, starLocation.y, 'star');
    self.physics.add.overlap(self.ship, self.star, function () {
      // debugger;
      // self.star.destroy();
      this.socket.emit('starCollected');
    }, null, self);
  });

  this.blueScoreText = this.add.text(16, 16, '', { fontSize: '32px', fill: '#0000FF' });
  // this.blueScoreText.fixedToCamera = true;
  this.blueScoreText.setScrollFactor(0,0);
  this.redScoreText = this.add.text(window.innerWidth - 216, 16, '', { fontSize: '32px', fill: '#FF0000' });
  // this.redScoreText.fixedToCamera = true;
  this.redScoreText.setScrollFactor(0,0);

    
  this.socket.on('scoreUpdate', function (scores) {
    self.blueScoreText.setText('Blue: ' + scores.blue);
    self.redScoreText.setText('Red: ' + scores.red);
  });

}
 
function update() {
  if (this.ship) {
    if (this.cursors.left.isDown) {
      this.ship.setAngularVelocity(-150);
    } else if (this.cursors.right.isDown) {
      this.ship.setAngularVelocity(150);
    } else {
      this.ship.setAngularVelocity(0);
    }
  
    if (this.cursors.up.isDown) {
      this.physics.velocityFromRotation(this.ship.rotation + 1.5, -100, this.ship.body.acceleration);
    } else {
      this.ship.setAcceleration(0);
    }
  
    // this.physics.world.wrap(this.ship, 5);
  
    // emit player movement
    var x = this.ship.x;
    var y = this.ship.y;
    var r = this.ship.rotation;
    if (this.ship.oldPosition && (x !== this.ship.oldPosition.x || y !== this.ship.oldPosition.y || r !== this.ship.oldPosition.rotation)) {
      this.socket.emit('playerMovement', { x: this.ship.x, y: this.ship.y, rotation: this.ship.rotation });
    }
    
    // save old position data
    this.ship.oldPosition = {
      x: this.ship.x,
      y: this.ship.y,
      rotation: this.ship.rotation
    };
  }


  // scroll the texture of the tilesprites proportionally to the camera scroll
  this.spacebg.tilePositionX = this.cameras.main.scrollX * .3;
  this.spacebg.tilePositionY = this.cameras.main.scrollY * .3;
}

function addPlayer(self, playerInfo) {
  self.ship = self.physics.add.image(playerInfo.x, playerInfo.y, 'ship').setOrigin(0.5, 0.5).setDisplaySize(53, 40);
  if (playerInfo.team === 'blue') {
    self.ship.setTint(0x0000ff);
  } else {
    self.ship.setTint(0xff0000);
  }
  self.ship.setDrag(100);
  self.ship.setAngularDrag(100);
  self.ship.setMaxVelocity(200);
  self.ship.setCollideWorldBounds(true);

  self.cameras.main.startFollow(self.ship);

}

function addOtherPlayers(self, playerInfo) {
  const otherPlayer = self.add.image(playerInfo.x, playerInfo.y, 'otherPlayer').setOrigin(0.5, 0.5).setDisplaySize(53, 40);
  if (playerInfo.team === 'blue') {
    otherPlayer.setTint(0x0000ff);
  } else {
    otherPlayer.setTint(0xff0000);
  }
  otherPlayer.playerId = playerInfo.playerId;
  self.otherPlayers.add(otherPlayer);
}