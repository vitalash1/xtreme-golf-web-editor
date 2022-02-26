/* Canvas */

var canvas = document.getElementById("game");
var ctx = canvas.getContext("2d");
var images = [];

/* Tooltip */

var tooltip = document.getElementById("tooltip");
var tooltipOffset = 20;
var tooltipTimeToDisappear = 2;
var tooltipLastSet = tooltipTimeToDisappear;

/* Input */

var mouse = {x:0,y:0,realX:0,realY:0,clicking:false,rightClicking:false,justClicked:false};
var keys = [];

/* Editing */

var level = [];
var editingMode = true;
var selectedTile = undefined;
var paintingTile = 1;

/* Playing */

var levelPlayingBuffer = [];
var playerPosition = {x:0,y:0};
var ballPosition = {x:0,y:0};

/* Level */

var tileTypes = [{file:"tiles.png",start:0,end:8},{file:"player.png",start:9,end:9},{file:"ball.png",start:10,end:10},{file:"icons.png",start:11,end:12}];
var tileNames = ["Empty","Seismic Axe","Broken Axe","Magnet","Goal","Dynamite","Fan","Calculator","Wall","Player Spawn-point","Ball Spawn-point","Playtest Level","Import/Export Level"];
var tileLetters = "ABCDEFGHIJK";
var compressors = {"AB":"L","AC":"M","AD":"N","AE":"O","AF":"P","AG":"Q","AH":"R","AI":"S","AJ":"T","AK":"U",
					"II":"V","BI":"W","DI":"X","ID":"Y","DA":"Z"};
var playStopLevel = 11;
var exportImportLevel = 12;
var levelSize = 7;
var tileSize = 32;

/* Misc */

var globalTimer = 0;


window.addEventListener("mousemove",function(e) {
	var rect = canvas.getBoundingClientRect();
	var x = e.clientX - rect.x;
	var y = e.clientY - rect.y;
	x = x / rect.width * canvas.width;
	y = y / rect.height * canvas.height;
	x = Math.round(x);
	y = Math.round(y);
	mouse.x = x;
	mouse.y = y;
	mouse.realX = e.clientX;
	mouse.realY = e.clientY;
});
window.addEventListener("mousedown",function(e) {
	if(e.button === 0) {
		mouse.clicking = true;
		mouse.justClicked = true;
	} else if(e.button === 2) {
		mouse.rightClicking = true;
	}
});
window.addEventListener("mouseup",function(e) {
	if(e.button === 0) {
		mouse.clicking = false;
	} else {
		mouse.rightClicking = false;
	}
});
window.addEventListener("keydown",function(e) {
	keys[e.keyCode] = true;
});

function init() {
	for(var i = 0; i < levelSize; i++) {
		level[i] = [];
		for(var j = 0; j < levelSize; j++) {
			level[i][j] = 0;
		}
	}
	loop();
}

function loop() {
	window.requestAnimationFrame(function() {
		loop();
	});
	update();
	render();
	mouse.justClicked = false;
	keys = [];
}

function update() {
	globalTimer++;

	updateLevelEditing(level);
	updateLevelPlaying(levelPlayingBuffer);
	updateTooltip();
}

function render() {
	ctx.fillStyle = editingMode ? "lightblue" : "lightgreen";
	ctx.fillRect(0,0,canvas.width,canvas.height);
	renderLevel(editingMode ? level : levelPlayingBuffer);
}

function getLevelPosition() {
	return {x:canvas.width/2 - (levelSize*tileSize)/2,y:canvas.height/2 - (levelSize*tileSize)/2,width:levelSize*tileSize,height:levelSize*tileSize}
}
function getTileSelectorPosition() {
	return {x:5,y:5,width:tileSize/2,height:tileSize/2*(tileTypes[tileTypes.length-1].end+1)};
}

function collision(x,y,w,h,x2,y2,w2,h2) {
	return (x+w > x2 && y+h > y2 && x2 + w2 > x && y2 + h2 > y);
}

function updateLevelPlaying(levelToUpdate) {
	if(editingMode) {
		return;
	}
	setTooltip("Currently in PLAY mode!");
	var playerMoveTo = {x:playerPosition.x,y:playerPosition.y}
	if(keys[37]) {
		playerMoveTo.x--;
	} else if(keys[38]) {
		playerMoveTo.y--;
	} else if(keys[39]) {
		playerMoveTo.x++;
	} else if(keys[40]) {
		playerMoveTo.y++;
	}
	if(playerMoveTo.x != playerPosition.x || playerMoveTo.y != playerPosition.y) {
		//level border
		if(playerMoveTo.x < 0 || playerMoveTo.x == levelSize || playerMoveTo.y < 0 || playerMoveTo.y == levelSize) {
		} else {
			//not level border
			var tile = levelPlayingBuffer[playerMoveTo.y][playerMoveTo.x];
			//move into ball
			console.log(tile);
			if(playerMoveTo.x == ballPosition.x && playerMoveTo.y == ballPosition.y) {
				while(pushBall(playerMoveTo.x-playerPosition.x,playerMoveTo.y-playerPosition.y)) {
					//keep pushing
				}
			} else if(tile === 0) {
				playerPosition = playerMoveTo;
			} else if(tile === 1) {
				levelPlayingBuffer[playerMoveTo.y][playerMoveTo.x] = 2;
				var possibilities = [
					{x:-1,y:-1},{x:0,y:-1},{x:1,y:-1},
					{x:-1,y:0},            {x:1,y:0},
					{x:-1,y:-1}, {x:0,y:1},{x:1,y:1},
				];
				var len = possibilities.length;
				for(var i = 0; i < len; i++) {
					var x = possibilities.splice(randInt(0,possibilities.length),1)[0];
					if(pushBall(x.x,x.y)) {
						break;
					}
				}
			} else if(tile === 3 || tile === 6) {
				var newPosition = {x:playerMoveTo.x-playerPosition.x,y:playerMoveTo.y-playerPosition.y};
				newPosition.x += playerMoveTo.x;
				newPosition.y += playerMoveTo.y;
				if(!outOfBounds(newPosition.x,newPosition.y) && levelPlayingBuffer[newPosition.y][newPosition.x] === 0 && (newPosition.x != ballPosition.x || newPosition.y != ballPosition.y)) {
					levelPlayingBuffer[newPosition.y][newPosition.x] = tile;
					levelPlayingBuffer[playerMoveTo.y][playerMoveTo.x] = 0;
				}
			} else if(tile === 5) {
				for(var i = Math.max(0,playerMoveTo.y - 1); i < Math.min(levelSize,playerMoveTo.y+2); i++) {
					for(var j = Math.max(0,playerMoveTo.x - 1); j < Math.min(levelSize,playerMoveTo.x+2); j++) {
						if(levelPlayingBuffer[i][j] === 7) {
							alert("You Lost (calculator destroyed)");
						}
						//dont destroy goal
						if(levelPlayingBuffer[i][j] === 4) {
							continue;
						}
						levelPlayingBuffer[i][j] = 0;
					}	
				}
			}
		}
	}
	for(var i in levelPlayingBuffer) {
		for(var j in levelPlayingBuffer[i]) {
			//magnet
			if(levelPlayingBuffer[i][j] === 3) {
				if(Math.abs(ballPosition.x - j) == 2 && ballPosition.y == i) {
					pushBall((j-ballPosition.x)/2,0);
				} else if(Math.abs(ballPosition.y - i) == 2 && ballPosition.x == j) {
					pushBall(0,(i-ballPosition.y)/2);
				}

			} else if(levelPlayingBuffer[i][j] === 6) {
				//fan
				if(Math.abs(ballPosition.x - j) <= 1 && ballPosition.y == i) {
					pushBall(ballPosition.x-j,0);
				} else if(Math.abs(ballPosition.y - i) <= 1 && ballPosition.x == j) {
					pushBall(0,ballPosition.y-i);
				}
			}
		}
	}
}

function randInt(x,y) {
	return Math.floor(Math.random()*(y-x))+x;
}

function outOfBounds(x,y) {
	return (x < 0 || y < 0 || x >= levelSize || y >= levelSize);
}

function pushBall(x,y) {
	if(outOfBounds(ballPosition.x + x,ballPosition.y + y)) {
		return false;
	}
	var tile = levelPlayingBuffer[ballPosition.y+y][ballPosition.x+x];
	if(tile !== 0) {
		if(tile === 4) {
			alert("You Won (ball reached goal)");
			togglePlay();
		}
		if(tile === 7) {
			alert("You Lost (ball hit calculator)");
			togglePlay();
		} 
		return false;
	}
	ballPosition.x += x;
	ballPosition.y += y;
	return true;
}

function updateLevelEditing(levelToUpdate) {

	var pos = getLevelPosition();
	var selectorPos = getTileSelectorPosition();
	if(editingMode && collision(mouse.x,mouse.y,0,0,pos.x,pos.y,pos.width,pos.height)) {
		selectedTile = {x:Math.floor((mouse.x - pos.x) / pos.width * levelSize),y:Math.floor((mouse.y - pos.y) / pos.height * levelSize)};
		if(mouse.clicking)
			level[selectedTile.y][selectedTile.x] = paintingTile;
		else if(mouse.rightClicking) {
			level[selectedTile.y][selectedTile.x] = 0;
		}
	} else if(collision(mouse.x,mouse.y,0,0,selectorPos.x,selectorPos.y,selectorPos.width,selectorPos.height)) {
		selectedTile = {x:-Math.floor((mouse.y - selectorPos.y) / (tileSize/2))-1,y:0};
		setTooltip(tileNames[Math.abs(selectedTile.x+1)])
		if(mouse.clicking) {
			var numb = Math.abs(selectedTile.x + 1);
			if(numb === playStopLevel) {
				if(mouse.justClicked) {
					togglePlay();
				}
			} else if(numb === exportImportLevel) {
				var levelCode = getLevelCode();
				if(mouse.justClicked)
					levelCode = prompt("Hello! Below is your level export code. If you would like to import a code, please replace the text below with that code and hit \"OK\" ",levelCode);
				if(levelCode !== null)
					loadLevelCode(levelCode);
			} else {
				paintingTile = numb;
			}
		}
	} else {
		selectedTile = undefined;
	}
}

function togglePlay() {
	editingMode =! editingMode;
	for(var i in level) {
		levelPlayingBuffer[i] = [];
		for(var j in level[i]) {
			levelPlayingBuffer[i][j] = level[i][j]
			if(levelPlayingBuffer[i][j] === 9) {
				playerPosition = {x:parseInt(j),y:parseInt(i)};
				levelPlayingBuffer[i][j] = 0;
			} else if(levelPlayingBuffer[i][j] === 10) {
				ballPosition = {x:parseInt(j),y:parseInt(i)};
				levelPlayingBuffer[i][j] = 0;
			}
		}
	}
}

function loadLevelCode(levelCode) {
	var newLevel = [];
	//decompress
	for(var i in compressors) {
		levelCode = levelCode.replaceAll(compressors[i],i);
	}
	//n,letter -> letter n times
	var newCode = "";
	for(var i = 0; i < levelCode.length; i++) {
		var value = levelCode.substring(i,i+1);
		if(isNaN(parseInt(value))) {
			if(i > 0 && !isNaN(parseInt(levelCode[i-1]))) {
				var prev = NaN;
				var total = parseInt(levelCode[i-1]);
				if(i > 1)
					prev = parseInt(levelCode[i-2]);
				if(!isNaN(prev))
					total += prev*10;
				for(var j = 0; j < total; j++) {
					newCode += value;
				}
			} else {
				newCode += value;
			}
		}
	}
	for(var i in newCode) {
		var y = Math.floor(i/levelSize);
		var x = i - (y*levelSize);
		level[y][x] = tileLetters.indexOf(newCode[i]);
	}
}

function insert(string,insert,index) {
	return string.substring(0,index) + insert + string.substring(index);
}

function getLevelCode() {
	var newLevel = [];
	var levelCode = "";
	for(var i = 0; i < level.length; i++) {
		for(var j = 0; j < level[i].length; j++) {
			newLevel[i*level[i].length + j] = level[i][j];
		}
	}
	for(var i = 0; i < newLevel.length; i++) {
		if(i > 0 && newLevel[i-1] == newLevel[i]) {
			continue;
		}
		for(var j = i+1; j <= newLevel.length; j++) {
			if(newLevel[j] != newLevel[i] || j == newLevel.length-1) {
				if(j-i > 2) {
					levelCode += "" + (j-i + (j == newLevel.length-1 && newLevel[i] == newLevel[j] ? 1 : 0));
				} else if(j-i == 2) {
					levelCode += tileLetters.substring(newLevel[i],newLevel[i]+1);
				}
				levelCode += tileLetters.substring(newLevel[i],newLevel[i]+1);
				break;
			}
		}
	}
	//compress
	for(var i in compressors) {
		levelCode = levelCode.replace(i,function(match,offset,string) {
			if(offset === 0 || isNaN(parseInt(string.substring(offset-1,offset)))) {
				return compressors[i];
			} else {
				return match;
			}
		});
	}
	console.log(levelCode);
	return levelCode;
}

function setTooltip(text) {
	tooltip.innerHTML = text;
	tooltipLastSet = 0;
}

function updateTooltip() {
	tooltip.style.left = mouse.realX + tooltipOffset + "px";
	tooltip.style.top = mouse.realY + tooltipOffset + "px";
	tooltipLastSet++;
	if(tooltipLastSet >= tooltipTimeToDisappear) {
		tooltip.style.visibility = "hidden";
	} else {
		tooltip.style.visibility = "visible";
	}
}

function renderLevel(levelToRender) {
	var pos = getLevelPosition();
	var posSelector = getTileSelectorPosition();

	//background layer
	for(var i in levelToRender) {
		for(var j in levelToRender[i]) {
			ctx.drawImage(images["tiles.png"],0,0,tileSize,tileSize,pos.x+j*tileSize,pos.y+i*tileSize,tileSize,tileSize);
		}
	}
	//foreground layer
	for(var i in levelToRender) {
		for(var j in levelToRender[i]) {
			if(levelToRender[i][j] == 0) continue; //don't render grass on foreground layer
			var tileType = getTileType(levelToRender[i][j]);
			ctx.drawImage(images[tileType.file],(levelToRender[i][j]-tileType.start) * tileSize,0,tileSize,tileSize,pos.x+j*tileSize,pos.y+i*tileSize,tileSize,tileSize);
		}
	}
	ctx.globalAlpha = Math.sin(globalTimer/Math.PI/4)/16+0.2;
	//fan/magnet lines
	for(var i in levelToRender) {
		for(var j in levelToRender[i]) {
			if(levelToRender[i][j] != 3 && levelToRender[i][j] != 6) continue; //don't render grass on foreground layer
			var range = levelToRender[i][j] === 3 ? 2*tileSize+tileSize/2 : 1*tileSize+tileSize/2;
			var color = levelToRender[i][j] === 3 ? "yellow" : "white";
			ctx.fillStyle = color;
			ctx.fillRect(pos.x + j*tileSize - range + tileSize/2,pos.y + i*tileSize + tileSize/2,range*2,2);
			ctx.fillRect(pos.x + j*tileSize + tileSize/2,pos.y + i*tileSize - range + tileSize/2,2,range*2);
		}
	}
	ctx.globalAlpha = 1;
	//tile selector
	var y = 0;
	var padding = 2;
	var outlinePadding = -1;
	ctx.fillStyle = "darkgray";
	ctx.fillRect(posSelector.x,posSelector.y,posSelector.width,posSelector.height);
	ctx.fillStyle = "black";
	ctx.lineWidth = 2;
	ctx.strokeRect(posSelector.x-padding,posSelector.y-padding,posSelector.width+padding*2,posSelector.height+padding*2);
	for(var i in tileTypes) {
		for(var j = 0; j <= tileTypes[i].end-tileTypes[i].start; j++) {
			var off = 0;
			if(tileTypes[i].start + j == playStopLevel && !editingMode) {
				off = 64;
			}
			ctx.drawImage(images[tileTypes[i].file],j*tileSize + off,0,tileSize,tileSize,posSelector.x,posSelector.y + y*tileSize/2,tileSize/2,tileSize/2)
			if(y === paintingTile) {
				ctx.fillStyle = "black";
				ctx.lineWidth = 2;
				ctx.strokeRect(posSelector.x-outlinePadding,posSelector.y + y*tileSize/2 - outlinePadding,tileSize/2 + outlinePadding*2,tileSize/2 + outlinePadding*2);
			}
			y++;
		}
	}

	if(selectedTile !== undefined) {
		ctx.save();
		ctx.globalAlpha = Math.sin(globalTimer / Math.PI / 4)/8+0.4;
		ctx.fillStyle = "white";
		if(selectedTile.x < 0 && Math.abs(selectedTile.x+1) != paintingTile) {
			ctx.fillRect(posSelector.x,Math.abs(selectedTile.x+1)*(tileSize/2) + posSelector.y,tileSize/2,tileSize/2);
		} else if(selectedTile.x >= 0 && editingMode) {
			var paintingType = getTileType(paintingTile);
			ctx.drawImage(images[paintingType.file],(paintingTile-paintingType.start)*tileSize,0,tileSize,tileSize,selectedTile.x*tileSize + pos.x,selectedTile.y*tileSize + pos.y,tileSize,tileSize);
			ctx.fillRect(selectedTile.x*tileSize + pos.x,selectedTile.y*tileSize + pos.y,tileSize,tileSize);
		}
		ctx.restore();
	}

	//ball and player
	if(!editingMode) {
		ctx.drawImage(images["ball.png"],pos.x + ballPosition.x*tileSize,pos.y + ballPosition.y*tileSize,tileSize,tileSize);
		ctx.drawImage(images["player.png"],0,0,32,32,pos.x + playerPosition.x*tileSize,pos.y + playerPosition.y*tileSize,tileSize,tileSize);
	}
}

function getTileType(tileNumber) {
	for(var i in tileTypes) {
		if(tileNumber < tileTypes[i].start || tileNumber > tileTypes[i].end) {
			continue;
		}
		return tileTypes[i];
	}
}

function loadImages(list) {
	var imagesNeeded = list.length;
	var imagesLoaded = 0;
	for(var i in list) {
		var image = new Image()
		image.src = "images/" + list[i];
		image.onload = function() {
			imagesLoaded++;
			images[this.getAttribute("src").substring(7)] = this;
			if(imagesLoaded >= imagesNeeded) {
				init();
			}
		}
	}
};

loadImages(["ball.png","player.png","tiles.png","icons.png"]);
