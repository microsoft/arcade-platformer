
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

    export enum MovingDirection {
        //% block=none
        None = 0,
        //% block=left
        Left = 1,
        //% block=right
        Right = 2,
        //% block=up
        Up = 3,
        //% block=down
        Down = 4
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
        MovementAcceleration,
        //% block="ground friction"
        GroundFriction,
        //% block="air friction"
        AirFriction,
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
        //% block="facing left"
        FacingLeft = 1 << 0,
        //% block="facing right"
        FacingRight = 1 << 1,
        //% block="moving"
        Moving = 1 << 2,
        //% block="wall sliding"
        WallSliding = 1 << 3,
        //% block="on wall right"
        OnWallRight = 1 << 4,
        //% block="on wall left"
        OnWallLeft = 1 << 5,
        //% block="on ground"
        OnGround = 1 << 6,
        //% block="jumping up"
        JumpingUp = 1 << 7,
        //% block="after jump apex"
        AfterJumpApex = 1 << 8,
        //% block="turning"
        Turning = 1 << 9,
        // 1 << 10 is available
        //% block="pushing wall left"
        PushingWallLeft = 1 << 11,
        //% block="pushing wall right"
        PushingWallRight = 1 << 12,
        //% block="accelerating"
        Accelerating = 1 << 13,
        //% block="falling"
        Falling = 1 << 14,
        //% block="at max running speed"
        MaxRunningSpeed = 1 << 15,
        //% block="decelerating"
        Decelerating = 1 << 16,
        //% block="above max speed"
        AboveMaxSpeed = 1 << 17,
    }

    export enum EventHandlerCondition {
        //% block="becomes true"
        BecomesTrue,
        //% block="becomes false"
        BecomesFalse
    }

    /**
     * Create a new sprite from an image
     * @param img the image
     */
    //% group="Sprites"
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

    //% group="Sprites"
    //% blockId=platformerSetConstant
    //% block="$sprite set value for $constant to $value"
    //% sprite.shadow=variables_get
    //% sprite.defl=mySprite
    //% constant.shadow=platformer_constant
    export function setConstant(sprite: Sprite, constant: number, value: number) {
        _assertPlatformerSprite(sprite);

        (sprite as PlatformerSprite).constants.setValue(constant, value);
    }

    //% group="Sprites"
    //% blockId=platformerHasState
    //% block="$sprite has state $flag"
    //% sprite.shadow=variables_get
    //% sprite.defl=mySprite
    //% flag.shadow=platformer_state
    export function hasState(sprite: Sprite, flag: number) {
        _assertPlatformerSprite(sprite);

        return (sprite as PlatformerSprite).hasState(flag);
    }

    //% blockId=platformer_direction
    //% block="$direction"
    //% shim=TD_ID
    //% blockHidden
    export function _direction(direction: Direction): number {
        return direction;
    }

    //% group="Controls"
    //% blockId=platformer_movingDirection
    //% block="$direction"
    //% shim=TD_ID
    export function _movingDirection(direction: MovingDirection): number {
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

    //% group="Controls"
    //% blockId=platformermoveSprite
    //% block="set controls for $sprite $enabled|| with speed $moveSpeed and controller $player"
    //% sprite.shadow=variables_get
    //% sprite.defl=mySprite
    //% moveSpeed.defl=60
    //% enabled.shadow=toggleOnOff
    //% enabled.defl=true
    //% inlineInputMode=inline
    export function moveSprite(sprite: Sprite, enabled: boolean, moveSpeed?: number, player?: controller.Controller) {
        _assertPlatformerSprite(sprite);

        const pSprite = sprite as PlatformerSprite;

        pSprite.player = player || pSprite.player || controller.player1
        if (enabled) {
            pSprite.pFlags |= PlatformerFlags.ControlsEnabled;
            pSprite.constants.setValue(PlatformerConstant.MoveSpeed, moveSpeed);
        }
        else {
            pSprite.pFlags &= ~(
                PlatformerFlags.ControlsEnabled
            );
        }
    }

    //% group="Controls"
    //% blockId=platformer_setMoving
    //% block="$sprite set moving $direction"
    //% sprite.shadow=variables_get
    //% sprite.defl=mySprite
    //% direction.shadow=platformer_movingDirection
    export function setMoving(sprite: Sprite, direction: number) {
        _assertPlatformerSprite(sprite);

        (sprite as PlatformerSprite).setMoving(direction);
    }

    //% group="Controls"
    //% blockId=platformer_jump
    //% block="$sprite jump||$height pixels"
    //% sprite.shadow=variables_get
    //% sprite.defl=mySprite
    //% height.defl=32
    export function jump(sprite: Sprite, height?: number) {
        _assertPlatformerSprite(sprite);

        (sprite as PlatformerSprite).jump(height);
    }

    //% group="Controls"
    //% blockId=platformer_setGravityEnabled
    //% block="$sprite set gravity enabled $enabled"
    //% sprite.shadow=variables_get
    //% sprite.defl=mySprite
    //% enabled.defl=false
    export function setGravityEnabled(sprite: Sprite, enabled: boolean) {
        _assertPlatformerSprite(sprite);

        if (enabled) {
            (sprite as PlatformerSprite).setGravity(_state().gravity, _state().gravityDirection)
        }
        else {
            (sprite as PlatformerSprite).setGravity(0, _state().gravityDirection)
        }
    }

    //% blockId=platformer_onRuleBecomesTrue
    //% block="$sprite on state $rule $condition with $sprite"
    //% sprite.shadow=variables_get
    //% sprite.defl=mySprite
    //% rule.shadow=arcade_mp_character_make_rule
    //% handlerStatement=true
    //% draggableParameters=reporter
    //% group="Events"
    //% weight=100
    //% blockGap=8
    export function onRuleBecomesTrue(rule: number, condition: EventHandlerCondition, handler: (sprite: PlatformerSprite) => void) {
        _state().addEventHandler(rule, condition, handler);
    }

    //% blockId=platformer_onSpriteRuleBecomesTrue
    //% block="on state $rule becomes true for $sprite"
    //% rule.shadow=arcade_mp_character_make_rule
    //% handlerStatement=true
    //% draggableParameters=reporter
    //% group="Events"
    //% weight=90
    export function onSpriteRuleBecomesTrue(sprite: Sprite, rule: number, condition: EventHandlerCondition, handler: (sprite: PlatformerSprite) => void) {
        _assertPlatformerSprite(sprite);
        (sprite as PlatformerSprite).addEventHandler(rule, condition, handler);
    }

    //% group="Settings"
    //% blockId=platformerSetGravity
    //% block="set gravity $strength||$direction"
    //% strength.defl=500
    //% direction.shadow=platformer_direction
    export function setGravity(strength: number, direction?: number) {
        _state().setGravity(strength, direction == undefined ? Direction.Down : direction);
    }

    //% group="Settings"
    //% blockId=platformerSetFeatureEnabled
    //% block="set feature $feature $enabled"
    //% feature.shadow=platformer_feature
    //% enabled.shadow=toggleOnOff
    //% enabled.defl=true
    export function setFeatureEnabled(feature: number, enabled: boolean) {
        _state().setTemplateFlag(feature, enabled);
    }

    //% group="Settings"
    //% blockId=platformerSetConstantDefault
    //% block="set default value for $constant to $value"
    //% constant.shadow=platformer_constant
    export function setConstantDefault(constant: number, value: number) {
        _state().setGlobalConstant(constant, value);
    }
}