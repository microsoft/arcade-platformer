game.stats = true;
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
    `, SpriteKind.Player) as platformer.PlatformerSprite;
mySprite.setPlatformerFlag(platformer.PlatformerFlags.WallJumps, true);
scene.cameraFollowSprite(mySprite)
platformer.setGravity(200, platformer.Direction.Down)
platformer.moveSprite(
    mySprite,
    true,
    100
)


const left = img`
    3 3 3 1 3 3 3 3
    3 3 1 1 3 3 3 3
    3 1 1 1 3 3 3 3
    1 1 1 1 1 1 1 1
    1 1 1 1 1 1 1 1
    3 1 1 1 3 3 3 3
    3 3 1 1 3 3 3 3
    3 3 3 1 3 3 3 3
    `

const right = img`
    3 3 3 3 1 3 3 3
    3 3 3 3 1 1 3 3
    3 3 3 3 1 1 1 3
    1 1 1 1 1 1 1 1
    1 1 1 1 1 1 1 1
    3 3 3 3 1 1 1 3
    3 3 3 3 1 1 3 3
    3 3 3 3 1 3 3 3
    `

const left2 = img`
    2 2 1 2 2
    2 1 1 2 2
    1 1 1 2 2
    2 1 1 2 2
    2 2 1 2 2
`

const right2 = img`
    2 2 1 2 2
    2 2 1 1 2
    2 2 1 1 1
    2 2 1 1 2
    2 2 1 2 2
`

platformer.loopFrames(mySprite, [left], 100, platformer.rule(platformer.PlatformerSpriteState.FacingLeft));
platformer.loopFrames(mySprite, [right], 100, platformer.rule(platformer.PlatformerSpriteState.FacingRight));


platformer.setConstant(mySprite, platformer.PlatformerConstant.WallJumpHeight, 16)
platformer.setConstant(mySprite, platformer.PlatformerConstant.WallJumpKickoffVelocity, 50)


// let testEnemy = platformer.create(img`
//     2 2 2 2 2
//     2 2 2 2 2
//     2 2 2 2 d
//     2 2 2 2 2
//     2 2 2 2 2
// `, SpriteKind.Enemy) as platformer.PlatformerSprite;

// testEnemy.setMoving(platformer.MovingDirection.Right);
// platformer.loopFrames(testEnemy, [left2], 100, platformer.rule(platformer.PlatformerSpriteState.FacingLeft));
// platformer.loopFrames(testEnemy, [right2], 100, platformer.rule(platformer.PlatformerSpriteState.FacingRight));
// game.onUpdate(() => {
//     if (testEnemy.hasState(platformer.PlatformerSpriteState.PushingWallRight)) {
//         testEnemy.setMoving(platformer.MovingDirection.Left)
//     }
//     if (testEnemy.hasState(platformer.PlatformerSpriteState.PushingWallLeft)) {
//         testEnemy.setMoving(platformer.MovingDirection.Right)
//     }

//     if (Math.percentChance(5) && testEnemy.hasState(platformer.PlatformerSpriteState.OnGround)) {
//         testEnemy.jump(32);
//     }
// });

controller.menu.onEvent(ControllerButtonEvent.Pressed, () => {
    platformer.moveSprite(
        mySprite,
        !(mySprite.pFlags & platformer.PlatformerFlags.ControlsEnabled),
        100
    )
})

let printedSprite = mySprite;
game.onShade(() => {
    top = 5;
    if (printedSprite.pFlags & platformer.PlatformerFlags.ControlsEnabled) {
        printState("Controls enabled")
    }
    if (printedSprite.hasState(platformer.PlatformerSpriteState.FacingLeft)) {
        printState("FacingLeft");
    }
    if (printedSprite.hasState(platformer.PlatformerSpriteState.FacingRight)) {
        printState("FacingRight");
    }
    if (printedSprite.hasState(platformer.PlatformerSpriteState.Moving)) {
        printState("Moving");
    }
    if (printedSprite.hasState(platformer.PlatformerSpriteState.WallSliding)) {
        printState("WallSliding");
    }
    if (printedSprite.hasState(platformer.PlatformerSpriteState.OnWallRight)) {
        printState("OnWallRight");
    }
    if (printedSprite.hasState(platformer.PlatformerSpriteState.OnWallLeft)) {
        printState("OnWallLeft");
    }
    if (printedSprite.hasState(platformer.PlatformerSpriteState.OnGround)) {
        printState("OnGround");
    }
    if (printedSprite.hasState(platformer.PlatformerSpriteState.JumpingUp)) {
        printState("JumpingUp");
    }
    if (printedSprite.hasState(platformer.PlatformerSpriteState.AfterJumpApex)) {
        printState("AfterJumpApex");
    }
    if (printedSprite.hasState(platformer.PlatformerSpriteState.Turning)) {
        printState("Turning");
    }
    if (printedSprite.hasState(platformer.PlatformerSpriteState.PushingWallLeft)) {
        printState("PushingWallLeft");
    }
    if (printedSprite.hasState(platformer.PlatformerSpriteState.PushingWallRight)) {
        printState("PushingWallRight");
    }
    if (printedSprite.hasState(platformer.PlatformerSpriteState.Accelerating)) {
        printState("Accelerating");
    }
    if (printedSprite.hasState(platformer.PlatformerSpriteState.Falling)) {
        printState("Falling");
    }
    if (printedSprite.hasState(platformer.PlatformerSpriteState.MaxRunningSpeed)) {
        printState("MaxRunningSpeed");
    }
    if (printedSprite.hasState(platformer.PlatformerSpriteState.Decelerating)) {
        printState("Decelerating");
    }
    if (printedSprite.hasState(platformer.PlatformerSpriteState.AboveMaxSpeed)) {
        printState("AboveMaxSpeed");
    }
})

music.setTempo(200)

platformer.onRuleBecomesTrue(platformer.rule(platformer.PlatformerSpriteState.OnGround), platformer.EventHandlerCondition.BecomesTrue, (sprite) => {
    // music.playTone(262, music.beat(BeatFraction.Sixteenth));
})

platformer.onRuleBecomesTrue(platformer.rule(platformer.PlatformerSpriteState.JumpingUp), platformer.EventHandlerCondition.BecomesTrue, (sprite) => {
    // music.playTone(500, music.beat(BeatFraction.Sixteenth));
})


platformer.setConstant(mySprite, platformer.PlatformerConstant.InAirJumps, 0);
platformer.setConstant(mySprite, platformer.PlatformerConstant.WallMinVelocity, 0);
platformer.setConstant(mySprite, platformer.PlatformerConstant.WallFriction, 99999);

controller.B.onEvent(ControllerButtonEvent.Pressed, () => {
    platformer.jump(mySprite, 16);
})

function dash() {
    platformer.setGravityEnabled(mySprite, false);
    platformer.moveSprite(mySprite, false);
    platformer.setFrictionEnabled(mySprite, false);
    if (controller.up.isPressed()) {
        mySprite.vx = 0;
        mySprite.vy = -300;
    }
    else if (platformer.hasState(mySprite, platformer.PlatformerSpriteState.FacingLeft)) {
        mySprite.vx = -300
    }
    else {
        mySprite.vx = 300
    }

    setTimeout(() => {
        platformer.setGravityEnabled(mySprite, true);
        platformer.moveSprite(mySprite, true, 100);
        platformer.setFrictionEnabled(mySprite, true);
    }, 100);
}