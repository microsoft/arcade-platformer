
//% color="#f56f42" icon="\uf062"
namespace platformer {
    export enum Direction {
        //% block=up
        Up,
        //% block=down
        Down,
        //% block=left
        Left,
        //% block=right
        Right
    }

    export enum PlatformerFeatures {
        //% block="jump on A button pressed"
        JumpOnAPressed = PlatformerFlags.JumpOnAPressed,
        //% block="jump on Up button pressed"
        JumpOnUpPressed = PlatformerFlags.JumpOnUpPressed,
        //% block="allow jump cancellation"
        AllowJumpCancellation = PlatformerFlags.AllowJumpCancellation,
        //% block="coyote time"
        CoyoteTime = PlatformerFlags.CoyoteTime,
        //% block="movement momentum"
        MovementMomentum = PlatformerFlags.MovementMomentum,
        //% block="wall jumps"
        WallJumps = PlatformerFlags.WallJumps,
    }

    export enum PlatformerConstant {
        //% block="movement speed"
        MoveSpeed,
        //% block="max jump height"
        MaxJumpHeight,
        //% block="movement acceleration"
        MomentumAcceleration,
        //% block="wall jump height"
        WallJumpHeight,
        //% block="wall kickoff velocity"
        WallJumpKickoffVelocity,
        //% block="coyote time"
        CoyoteTimeMillis,
        //% block="jump grace period"
        JumpGracePeriodMillis,
        //% block="wall friction"
        WallFriction,
        //% block="wall min velocity"
        WallMinVelocity,
    }

    export enum PlatformerSpriteState {
        FacingLeft = 1 << 0,
        FacingRight = 1 << 1,
        Moving = 1 << 2,
        WallSliding = 1 << 3,
        OnWallRight = 1 << 4,
        OnWallLeft = 1 << 5,
        OnGround = 1 << 6,
        JumpingUp = 1 << 7,
        AfterJumpApex = 1 << 8,
        Turning = 1 << 9,
        // 1 << 10 is available
        PushingWallLeft = 1 << 11,
        PushingWallRight = 1 << 12,
        Accelerating = 1 << 13,
        Falling = 1 << 14,
        MaxRunningSpeed = 1 << 15,
        Decelerating = 1 << 16
    }

    /**
     * Create a new sprite from an image
     * @param img the image
     */
    //% group="Create"
    //% blockId=platformercreate block="platformer sprite $img of kind $kind"
    //% expandableArgumentMode=toggle
    //% blockSetVariable=mySprite
    //% weight=100
    //% img.shadow=screen_image_picker
    //% kind.shadow=spritekind
    export function create(img: Image, kind?: number): PlatformerSprite {
        const scene = game.currentScene();
        const sprite = new PlatformerSprite(img)
        sprite.setKind(kind);
        scene.physicsEngine.addSprite(sprite);

        // run on created handlers
        scene.createdHandlers
            .filter(h => h.kind == kind)
            .forEach(h => h.handler(sprite));

        return sprite
    }


    //% blockId=platformerSetGravity
    //% block="set gravity $strength||$direction"
    //% strength.defl=500
    //% direction.shadow=platformer_direction
    export function setGravity(strength: number, direction?: number) {
        _state().setGravity(strength, direction == undefined ? Direction.Down : direction);
    }

    //% blockId=platformer_direction
    //% block="$direction"
    //% shim=TD_ID
    //% blockHidden
    export function _direction(direction: Direction): number {
        return direction;
    }

    //% blockId=platformer_feature
    //% block="$feature"
    //% shim=TD_ID
    //% blockHidden
    export function _feature(feature: PlatformerFeatures): number {
        return feature;
    }

    //% blockId=platformer_constant
    //% block="$constant"
    //% shim=TD_ID
    //% blockHidden
    export function _constant(constant: PlatformerConstant): number {
        return constant;
    }

    //% blockId=platformer_state
    //% block="$state"
    //% shim=TD_ID
    //% blockHidden
    export function _platformerState(state: PlatformerSpriteState): number {
        return state;
    }

    //% blockId=platformermoveSprite
    //% block="set controls for $sprite $enabled|| with speed $moveSpeed and controller $player"
    //% sprite.shadow=variables_get
    //% sprite.defl=mySprite
    //% moveSpeed.defl=60
    //% enabled.shadow=toggleOnOff
    //% enabled.defl=true
    export function moveSprite(sprite: PlatformerSprite, enabled: boolean, moveSpeed?: number, player?: controller.Controller) {
        sprite.player = player || sprite.player || controller.player1
        if (enabled) {
            sprite.pFlags |= PlatformerFlags.ControlsEnabled;
            sprite.constants.setValue(PlatformerConstant.MoveSpeed, moveSpeed);
        }
        else {
            sprite.pFlags &= ~(
                PlatformerFlags.ControlsEnabled
            );
        }
    }

    //% blockId=platformerSetFeatureEnabled
    //% block="set feature $feature $enabled"
    //% feature.shadow=platformer_feature
    //% enabled.shadow=toggleOnOff
    //% enabled.defl=true
    export function setFeatureEnabled(feature: number, enabled: boolean) {
        _state().setTemplateFlag(feature, enabled);
    }

    //% blockId=platformerSetConstantDefault
    //% block="set default value for $constant to $value"
    //% constant.shadow=platformer_constant
    export function setConstantDefault(constant: number, value: number) {
        _state().setGlobalConstant(constant, value);
    }

    //% blockId=platformerSetConstant
    //% block="$sprite set value for $constant to $value"
    //% sprite.shadow=variables_get
    //% sprite.defl=mySprite
    //% constant.shadow=platformer_constant
    export function setConstant(sprite: PlatformerSprite, constant: number, value: number) {
        sprite.constants.setValue(constant, value);
    }

    //% blockId=platformerHasState
    //% block="$sprite has state $flag"
    //% sprite.shadow=variables_get
    //% sprite.defl=mySprite
    //% flag.shadow=platformer_state
    export function hasState(sprite: PlatformerSprite, flag: number) {
        return sprite.hasState(flag);
    }
}