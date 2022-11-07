function printState(message: string) {
    screen.print(message, 10, top, 15);
    top += 8
}
let top = 0
// Triple jumps (mario)
tiles.setCurrentTilemap(tilemap`level1`)
let mySprite = platformer.create(img`
    3 3 3 3 3 3 3 3
    3 3 3 3 3 3 3 3
    3 3 3 3 3 3 3 3
    3 3 3 3 3 3 3 3
    3 3 3 3 3 3 3 3
    3 3 3 3 3 3 3 3
    3 3 3 3 3 3 3 3
    3 3 3 3 3 3 3 3
    `, SpriteKind.Player)
scene.cameraFollowSprite(mySprite)
platformer.setGravity(1000, platformer.Direction.Down)
platformer.moveSprite(
    mySprite,
    true,
    100
)
game.onShade(() => {
    top = 5;
    if (mySprite.hasState(platformer.PlatformerSpriteState.FacingLeft)) {
        printState("FacingLeft");
    }
    if (mySprite.hasState(platformer.PlatformerSpriteState.FacingRight)) {
        printState("FacingRight");
    }
    if (mySprite.hasState(platformer.PlatformerSpriteState.Moving)) {
        printState("Moving");
    }
    if (mySprite.hasState(platformer.PlatformerSpriteState.WallSliding)) {
        printState("WallSliding");
    }
    if (mySprite.hasState(platformer.PlatformerSpriteState.OnWallRight)) {
        printState("OnWallRight");
    }
    if (mySprite.hasState(platformer.PlatformerSpriteState.OnWallLeft)) {
        printState("OnWallLeft");
    }
    if (mySprite.hasState(platformer.PlatformerSpriteState.OnGround)) {
        printState("OnGround");
    }
    if (mySprite.hasState(platformer.PlatformerSpriteState.JumpingUp)) {
        printState("JumpingUp");
    }
    if (mySprite.hasState(platformer.PlatformerSpriteState.AfterJumpApex)) {
        printState("AfterJumpApex");
    }
    if (mySprite.hasState(platformer.PlatformerSpriteState.Turning)) {
        printState("Turning");
    }
    if (mySprite.hasState(platformer.PlatformerSpriteState.PushingWallLeft)) {
        printState("PushingWallLeft");
    }
    if (mySprite.hasState(platformer.PlatformerSpriteState.PushingWallRight)) {
        printState("PushingWallRight");
    }
    if (mySprite.hasState(platformer.PlatformerSpriteState.Accelerating)) {
        printState("Accelerating");
    }
    if (mySprite.hasState(platformer.PlatformerSpriteState.Falling)) {
        printState("Falling");
    }
    if (mySprite.hasState(platformer.PlatformerSpriteState.MaxRunningSpeed)) {
        printState("MaxRunningSpeed");
    }
    if (mySprite.hasState(platformer.PlatformerSpriteState.Decelerating)) {
        printState("Decelerating");
    }
})
