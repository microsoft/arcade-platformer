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
mySprite.setPlatformerFlag(platformer.PlatformerFlags.WallJumps, true);
scene.cameraFollowSprite(mySprite)
platformer.setGravity(1000, platformer.Direction.Down)
platformer.moveSprite(
    mySprite,
    true,
    100
)

platformer.setConstant(mySprite, platformer.PlatformerConstant.WallJumpHeight, 12)
platformer.setConstant(mySprite, platformer.PlatformerConstant.WallJumpKickoffVelocity, 200)


// let testEnemy = platformer.create(img`
//     2 2 2 2 2
//     2 2 2 2 2
//     2 2 2 2 2
//     2 2 2 2 2
//     2 2 2 2 2
// `, SpriteKind.Enemy);

// // testEnemy.setMoving(platformer.MovingDirection.Right);
// game.onUpdate(() => {
//     if (testEnemy.hasState(platformer.PlatformerSpriteState.PushingWallRight)) {
//         // testEnemy.setMoving(platformer.MovingDirection.Left)
//     }
//     if (testEnemy.hasState(platformer.PlatformerSpriteState.PushingWallLeft)) {
//         // testEnemy.setMoving(platformer.MovingDirection.Right)
//     }

//     if (Math.percentChance(5) && testEnemy.hasState(platformer.PlatformerSpriteState.OnGround)) {
//         // testEnemy.jump(32);
//     }
// });

controller.menu.onEvent(ControllerButtonEvent.Pressed, () => {
    platformer.moveSprite(
        mySprite,
        !(mySprite.pFlags & platformer.PlatformerFlags.ControlsEnabled),
        100
    )
})

game.onShade(() => {
    top = 5;
    if (mySprite.pFlags & platformer.PlatformerFlags.ControlsEnabled) {
        printState("Controls enabled")
    }
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
    if (mySprite.hasState(platformer.PlatformerSpriteState.AboveMaxSpeed)) {
        printState("AboveMaxSpeed");
    }
})


controller.B.onEvent(ControllerButtonEvent.Pressed, () => {
    setTimeout(() => mySprite.image.fill(3), 100)
})