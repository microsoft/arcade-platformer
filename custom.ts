namespace platformer {
    export enum PlatformerFlags {
        ControlsEnabled = 1 << 0,
        InputLastFrame = 1 << 1,
        JumpOnAPressed = 1 << 2,
        JumpOnUpPressed = 1 << 3,
        AllowJumpCancellation = 1 << 4,
        CurrentlyJumping = 1 << 5,
        JumpStartedWithA = 1 << 6,
        CoyoteTime = 1 << 7,
        MovementMomentum = 1 << 8,
        WallJumps = 1 << 9,
        LastWallLeft = 1 << 10,
        Friction = 1 << 11,
        Gravity = 1 << 12
    }

    class PlatformerConstants {
        values: number[];

        constructor(public parent?: PlatformerConstants) {
            this.values = [];
        }

        setValue(constant: PlatformerConstant, value: number) {
            while (this.values.length < constant) {
                this.values.push(undefined);
            }
            this.values[constant] = value;
        }

        lookupValue(constant: PlatformerConstant): number {
            if (this.values[constant] === undefined) {
                return this.parent.lookupValue(constant);
            }
            return this.values[constant];
        }
    }

    export class EventHandler {
        constructor(public rule: number, public condition: EventHandlerCondition, public handler: (sprite: Sprite) => void) {
        }

        maybeRun(sprite: PlatformerSprite) {
            if (this.condition === EventHandlerCondition.BecomesFalse) {
                if (!_matchesRule(sprite.sFlags, this.rule) && _matchesRule(sprite.previousSFlags, this.rule)) {
                    this.handler(sprite);
                }
            }
            else if (this.condition === EventHandlerCondition.BecomesTrue) {
                if (_matchesRule(sprite.sFlags, this.rule) && !_matchesRule(sprite.previousSFlags, this.rule)) {
                    this.handler(sprite);
                }
            }
        }
    }

    function createDefaultConstants() {
        const res = new PlatformerConstants();
        res.setValue(PlatformerConstant.JumpGracePeriodMillis, 100)
        res.setValue(PlatformerConstant.CoyoteTimeMillis, 100)
        res.setValue(PlatformerConstant.MoveSpeed, 100)
        res.setValue(PlatformerConstant.MaxJumpHeight, 40)
        res.setValue(PlatformerConstant.MovementAcceleration, 700)
        res.setValue(PlatformerConstant.GroundFriction, 700)
        res.setValue(PlatformerConstant.AirFriction, 200)
        res.setValue(PlatformerConstant.WallJumpHeight, 16)
        res.setValue(PlatformerConstant.WallJumpKickoffVelocity, 200)
        res.setValue(PlatformerConstant.WallFriction, 500)
        res.setValue(PlatformerConstant.WallMinVelocity, 50)
        res.setValue(PlatformerConstant.InAirJumps, 0)
        res.setValue(PlatformerConstant.InAirJumpHeight, 20)
        return res;
    }

    const globalConstants = createDefaultConstants();

    export class PlatformerSprite extends Sprite {
        pFlags: number;
        sFlags: number;
        jumpStartTime: number;
        lastOnGroundTime: number;
        lastOnWallTime: number;
        lastJumpHeight: number;
        player: controller.Controller;
        moving: MovingDirection;
        dashEndTime: number;
        previousSFlags: number;

        constants: PlatformerConstants;
        eventHandlers: EventHandler[];
        jumpCount: number;

        constructor(img: Image) {
            super(img);

            this.setGravity(_state().gravity, _state().gravityDirection);
            _state().allSprites.push(this);
            this.pFlags = _state().templateFlags;
            this.constants = new PlatformerConstants(globalConstants);
            this.setStateFlag(PlatformerSpriteState.FacingRight, true);
            this.lastJumpHeight = 0;
            this.jumpCount = 0;
        }

        setPlatformerFlag(flag: number, enabled: boolean) {
            if (enabled) this.pFlags |= flag;
            else this.pFlags &= ~flag;
        }

        setStateFlag(flag: number, enabled: boolean) {
            if (enabled) this.sFlags |= flag;
            else this.sFlags &= ~flag;
        }

        hasState(flag: number) {
            return !!(this.sFlags & flag);
        }

        timeToJumpApex() {
            const gravity = Math.abs(_state().gravity);
            return (1000 * Math.sqrt(2 * this.lastJumpHeight * gravity) / gravity) | 0;
        }

        setGravity(strength: number, direction: Direction) {
            if (!(this.pFlags & PlatformerFlags.Gravity)) {
                this.ay = 0;
                this.ax = 0;
                return;
            }

            switch (direction) {
                case Direction.Down:
                    this.ay = strength;
                    this.ax = 0;
                    break;
                case Direction.Up:
                    this.ay = -strength;
                    this.ax = 0;
                    break;
                case Direction.Right:
                    this.ay = 0;
                    this.ax = strength;
                    break;
                case Direction.Left:
                    this.ay = 0;
                    this.ax = -strength;
                    break;
            }
        }

        setMoving(direction: MovingDirection) {
            switch (direction) {
                case MovingDirection.Left:
                case MovingDirection.Right:
                    this.moving = direction;
                    break;
                default:
                    this.moving = MovingDirection.None;
                    break;
            }
        }

        jump(pixels: number) {
            startJump(
                this,
                _state().gravity,
                _state().gravityDirection,
                pixels
            );
        }

        runEventHandlers() {
            if (this.eventHandlers) {
                for (const handler of this.eventHandlers) {
                    handler.maybeRun(this);
                }
            }

            for (const handler of _state().handlers) {
                handler.maybeRun(this);
            }
        }

        addEventHandler(rule: number, condition: EventHandlerCondition, handler: (sprite: Sprite) => void) {
            if (!this.eventHandlers) {
                this.eventHandlers = [];
            }
            this.eventHandlers.push(new EventHandler(rule, condition, handler));
        }
    }

    let stateStack: PlatformerState[];

    class PlatformerState {
        templateFlags: number;
        gravity: number;
        gravityDirection: Direction;

        allSprites: PlatformerSprite[];

        upButtonTimer: number[];
        upButtonIsPressed: boolean[];
        upButtonIsPressedLastFrame: boolean[];
        aButtonTimer: number[];
        aButtonIsPressed: boolean[];
        aButtonIsPressedLastFrame: boolean[];

        animations: _PlatformerAnimationState;
        handlers: EventHandler[];

        constructor() {
            this.gravity = 1000;
            this.gravityDirection = Direction.Down;

            this.allSprites = [];
            this.animations = new _PlatformerAnimationState();
            this.handlers = [];

            game.currentScene().eventContext.registerFrameHandler(scene.CONTROLLER_SPRITES_PRIORITY, () => {
                this.moveSprites();
            });

            this.upButtonTimer = [];
            this.upButtonIsPressed = [];
            this.upButtonIsPressedLastFrame = [];
            this.aButtonTimer = [];
            this.aButtonIsPressed = [];
            this.aButtonIsPressedLastFrame = [];

            let registerHandlers = (ctrl: controller.Controller, index: number) => {
                ctrl.A.addEventListener(ControllerButtonEvent.Pressed, () => {
                    this.aButtonIsPressedLastFrame[index] = false;
                    this.aButtonIsPressed[index] = true;
                    this.aButtonTimer[index] = game.runtime();
                });

                ctrl.A.addEventListener(ControllerButtonEvent.Released, () => {
                    this.aButtonIsPressed[index] = false;
                });

                ctrl.up.addEventListener(ControllerButtonEvent.Pressed, () => {
                    this.upButtonIsPressed[index] = true;
                    this.upButtonTimer[index] = game.runtime();
                });

                ctrl.up.addEventListener(ControllerButtonEvent.Released, () => {
                    this.upButtonIsPressed[index] = false;
                });
            }

            const players = [
                controller.player1,
                controller.player2,
                controller.player3,
                controller.player4
            ]

            for (let i = 0; i < players.length; i++) {
                this.upButtonTimer.push(0);
                this.upButtonIsPressed.push(false);
                this.aButtonTimer.push(0);
                this.aButtonIsPressed.push(false);
                registerHandlers(players[i], i);
            }

            this.setTemplateFlag(PlatformerFlags.AllowJumpCancellation, true)
            this.setTemplateFlag(PlatformerFlags.JumpOnAPressed, true)
            this.setTemplateFlag(PlatformerFlags.CoyoteTime, true)
            this.setTemplateFlag(PlatformerFlags.MovementMomentum, true)
            this.setTemplateFlag(PlatformerFlags.Gravity, true)
            this.setTemplateFlag(PlatformerFlags.Friction, true)
        }

        setGravity(strength: number, direction: Direction) {
            this.gravityDirection = direction;
            this.gravity = strength;
            for (const sprite of this.allSprites) {
                sprite.setGravity(strength, direction);
            }
        }

        moveSprites() {
            let svx = 0
            let svy = 0

            const dtMs = control.eventContext().deltaTimeMillis;
            for (const sprite of this.allSprites) {
                let vx = 0;
                let vy = 0;


                if (sprite.flags & sprites.Flag.Destroyed) {
                    continue;
                }

                const ctrl = sprite.player;

                if (sprite.moving === MovingDirection.Left) {
                    svx = -256;
                    svy = 0;
                }
                else if (sprite.moving === MovingDirection.Right) {
                    svx = 256;
                    svy = 0;
                }
                else if (sprite.moving === MovingDirection.Up) {
                    svx = 0;
                    svy = -256;
                }
                else if (sprite.moving === MovingDirection.Down) {
                    svx = 0;
                    svy = 256;
                }
                else if (ctrl && sprite.pFlags & PlatformerFlags.ControlsEnabled) {
                    if (ctrl.analog) {
                        svx = (ctrl.right.pressureLevel() - ctrl.left.pressureLevel()) >> 1
                        svy = (ctrl.down.pressureLevel() - ctrl.up.pressureLevel()) >> 1
                    } else {
                        svx = (ctrl.right.isPressed() ? 256 : 0) - (ctrl.left.isPressed() ? 256 : 0)
                        svy = (ctrl.down.isPressed() ? 256 : 0) - (ctrl.up.isPressed() ? 256 : 0)
                    }
                }
                else {
                    svx = 0;
                    svy = 0;
                }


                if (this.gravityDirection === Direction.Up || this.gravityDirection === Direction.Down) {
                    vx = sprite.constants.lookupValue(PlatformerConstant.MoveSpeed);
                    svy = 0;
                }
                else {
                    vy = sprite.constants.lookupValue(PlatformerConstant.MoveSpeed);
                    svx = 0;
                }


                if (sprite.pFlags & PlatformerFlags.MovementMomentum) {
                    const acc = Fx8(sprite.constants.lookupValue(PlatformerConstant.MovementAcceleration));
                    sprite.setStateFlag(PlatformerSpriteState.Turning, false);
                    sprite.setStateFlag(PlatformerSpriteState.Decelerating, false);
                    sprite.setStateFlag(PlatformerSpriteState.Accelerating, false);
                    sprite.setStateFlag(PlatformerSpriteState.MaxRunningSpeed, false);
                    sprite.setStateFlag(PlatformerSpriteState.AboveMaxSpeed, false);
                    if (svx || svy) {
                        if (vx) {
                            if (sprite.vx > 0 && sprite.vx > vx && svx > 0 || sprite.vx < 0 && sprite.vx < -vx && svx < 0) {
                                // we're going too fast, need to slow down
                                const friction = Fx.idiv(
                                    Fx.imul(
                                        Fx8(isOnGround(sprite, this.gravityDirection) ? sprite.constants.lookupValue(PlatformerConstant.GroundFriction) : sprite.constants.lookupValue(PlatformerConstant.AirFriction)),
                                        dtMs
                                    ),
                                    1000
                                );

                                const c = Fx.compare(sprite._vx, Fx.zeroFx8);
                                if (c < 0) { // v < f, v += f
                                    sprite._vx = Fx.min(Fx8(-vx), Fx.add(sprite._vx, friction));
                                }
                                else if (c > 0) { // v > f, v -= f
                                    sprite._vx = Fx.max(Fx8(vx), Fx.sub(sprite._vx, friction));
                                }

                                if (svx > 0) {
                                    sprite.setStateFlag(PlatformerSpriteState.MaxRunningSpeed, sprite.vx === vx);
                                }
                                else {
                                    sprite.setStateFlag(PlatformerSpriteState.MaxRunningSpeed, sprite.vx === -vx);
                                }

                                if (!sprite.hasState(PlatformerSpriteState.MaxRunningSpeed)) {
                                    sprite.setStateFlag(PlatformerSpriteState.Decelerating, true);
                                    sprite.setStateFlag(PlatformerSpriteState.AboveMaxSpeed, true);
                                }

                                sprite.setPlatformerFlag(PlatformerFlags.InputLastFrame, false);
                            }
                            else {
                                sprite._vx = Fx.add(
                                    sprite._vx,
                                    Fx.idiv(
                                        Fx.imul(
                                            Fx.mul(svx as any as Fx8, acc),
                                            dtMs
                                        ),
                                        1000
                                    )
                                );

                                if (svx > 0) {
                                    sprite.vx = Math.min(sprite.vx, vx);
                                    sprite.setStateFlag(PlatformerSpriteState.MaxRunningSpeed, sprite.vx === vx);
                                }
                                else {
                                    sprite.vx = Math.max(sprite.vx, -vx);
                                    sprite.setStateFlag(PlatformerSpriteState.MaxRunningSpeed, sprite.vx === -vx);
                                }

                                if (!sprite.hasState(PlatformerSpriteState.MaxRunningSpeed)) {
                                    if (Math.sign(sprite.vx) !== Math.sign(svx)) {
                                        sprite.setStateFlag(PlatformerSpriteState.Turning, true);
                                    }
                                    else {
                                        sprite.setStateFlag(PlatformerSpriteState.Accelerating, true);
                                    }
                                }
                            }
                        }
                        else if (vy) {
                            if (sprite.vy > 0 && sprite.vy > vy && svy > 0 || sprite.vy < 0 && sprite.vy < -vy && svy < 0) {
                                // we're going too fast, need to slow down
                                const friction = Fx.idiv(
                                    Fx.imul(
                                        Fx8(isOnGround(sprite, this.gravityDirection) ? sprite.constants.lookupValue(PlatformerConstant.GroundFriction) : sprite.constants.lookupValue(PlatformerConstant.AirFriction)),
                                        dtMs
                                    ),
                                    1000
                                );

                                const c = Fx.compare(sprite._vy, Fx.zeroFx8);
                                if (c < 0) { // v < f, v += f
                                    sprite._vy = Fx.min(Fx8(-vy), Fx.add(sprite._vy, friction));
                                }
                                else if (c > 0) { // v > f, v -= f
                                    sprite._vy = Fx.max(Fx8(vy), Fx.sub(sprite._vy, friction));
                                }

                                if (svy > 0) {
                                    sprite.setStateFlag(PlatformerSpriteState.MaxRunningSpeed, sprite.vy === vy);
                                }
                                else {
                                    sprite.setStateFlag(PlatformerSpriteState.MaxRunningSpeed, sprite.vy === -vy);
                                }

                                if (!sprite.hasState(PlatformerSpriteState.MaxRunningSpeed)) {
                                    sprite.setStateFlag(PlatformerSpriteState.Decelerating, true);
                                    sprite.setStateFlag(PlatformerSpriteState.AboveMaxSpeed, true);
                                }

                                sprite.setPlatformerFlag(PlatformerFlags.InputLastFrame, false);
                            }
                            else {
                                sprite._vy = Fx.add(
                                    sprite._vy,
                                    Fx.idiv(
                                        Fx.imul(
                                            Fx.mul(svy as any as Fx8, acc),
                                            dtMs
                                        ),
                                        1000
                                    )
                                );

                                if (svy > 0) {
                                    sprite.vy = Math.min(sprite.vy, vy);
                                    sprite.setStateFlag(PlatformerSpriteState.MaxRunningSpeed, sprite.vy === vy);
                                }
                                else {
                                    sprite.vy = Math.max(sprite.vy, -vy);
                                    sprite.setStateFlag(PlatformerSpriteState.MaxRunningSpeed, sprite.vy === -vy);
                                }

                                if (!sprite.hasState(PlatformerSpriteState.MaxRunningSpeed)) {
                                    if (Math.sign(sprite.vy) !== Math.sign(svy)) {
                                        sprite.setStateFlag(PlatformerSpriteState.Turning, true);
                                    }
                                    else {
                                        sprite.setStateFlag(PlatformerSpriteState.Accelerating, true);
                                    }
                                }
                            }
                        }
                        sprite.setPlatformerFlag(PlatformerFlags.InputLastFrame, true);
                    }
                    else if (sprite.pFlags & PlatformerFlags.Friction) {
                        const frictionAcc = Fx8(isOnGround(sprite, this.gravityDirection) ? sprite.constants.lookupValue(PlatformerConstant.GroundFriction) : sprite.constants.lookupValue(PlatformerConstant.AirFriction))
                        const friction = Fx.idiv(
                            Fx.imul(
                                frictionAcc,
                                dtMs
                            ),
                            1000
                        );

                        if (vx) {
                            const c = Fx.compare(sprite._vx, Fx.zeroFx8);
                            if (c < 0) { // v < f, v += f
                                sprite.setStateFlag(PlatformerSpriteState.Decelerating, true);
                                sprite._vx = Fx.min(Fx.zeroFx8, Fx.add(sprite._vx, friction));
                            }
                            else if (c > 0) { // v > f, v -= f
                                sprite.setStateFlag(PlatformerSpriteState.Decelerating, true);
                                sprite._vx = Fx.max(Fx.zeroFx8, Fx.sub(sprite._vx, friction));
                            }
                            else {
                                sprite.setStateFlag(PlatformerSpriteState.Decelerating, false);
                                sprite._vx = Fx.zeroFx8
                            }

                        }
                        else if (vy) {
                            const c = Fx.compare(sprite._vy, Fx.zeroFx8);
                            if (c < 0) { // v < f, v += f
                                sprite.setStateFlag(PlatformerSpriteState.Decelerating, true);
                                sprite._vy = Fx.min(Fx.zeroFx8, Fx.add(sprite._vy, friction));
                            }
                            else if (c > 0) { // v > f, v -= f
                                sprite.setStateFlag(PlatformerSpriteState.Decelerating, true);
                                sprite._vy = Fx.max(Fx.zeroFx8, Fx.sub(sprite._vy, friction));
                            }
                            else {
                                sprite.setStateFlag(PlatformerSpriteState.Decelerating, false);
                                sprite._vy = Fx.zeroFx8
                            }
                        }
                        sprite.setPlatformerFlag(PlatformerFlags.InputLastFrame, false);
                    }
                    else {
                        sprite.setStateFlag(PlatformerSpriteState.Decelerating, false);
                    }
                }
                else {
                    if (sprite.pFlags & PlatformerFlags.InputLastFrame) {
                        if (vx) sprite._vx = Fx.zeroFx8;
                        if (vy) sprite._vy = Fx.zeroFx8;
                    }

                    if (svx || svy) {
                        if (vx) {
                            sprite._vx = Fx.imul(svx as any as Fx8, vx)
                        } else if (vy) {
                            sprite._vy = Fx.imul(svy as any as Fx8, vy)
                        }
                        sprite.setPlatformerFlag(PlatformerFlags.InputLastFrame, true);
                    }
                    else {
                        sprite.setPlatformerFlag(PlatformerFlags.InputLastFrame, false);
                    }
                }

                let movingLaterally = false;
                let movingLeft = false;
                switch (this.gravityDirection) {
                    case Direction.Down:
                    case Direction.Up:
                        if (sprite.vx > 0 && sprite.isHittingTile(CollisionDirection.Right)) {
                            movingLaterally = false;
                            movingLeft = false;
                        }
                        else if (sprite.vx < 0 && sprite.isHittingTile(CollisionDirection.Left)) {
                            movingLaterally = false;
                            movingLeft = true;
                        }
                        else if (sprite.vx) {
                            movingLaterally = true;
                            movingLeft = sprite.vx < 0;
                        }
                        break;
                    case Direction.Right:
                    case Direction.Left:
                        if (sprite.vy > 0 && sprite.isHittingTile(CollisionDirection.Bottom)) {
                            movingLaterally = false;
                            movingLeft = false;
                        }
                        else if (sprite.vy < 0 && sprite.isHittingTile(CollisionDirection.Top)) {
                            movingLaterally = false;
                            movingLeft = true;
                        }
                        else if (sprite.vy) {
                            movingLaterally = true;
                            movingLeft = sprite.vy < 0;
                        }
                        break;

                }

                if (sprite.pFlags & PlatformerFlags.InputLastFrame) {
                    sprite.setStateFlag(PlatformerSpriteState.FacingLeft, movingLeft);
                    sprite.setStateFlag(PlatformerSpriteState.FacingRight, !movingLeft);
                }

                sprite.setStateFlag(PlatformerSpriteState.Moving, movingLaterally)
            }

            this.handleJumping();

            for (const sprite of this.allSprites) {
                if (sprite.flags & sprites.Flag.Destroyed) {
                    continue;
                }

                sprite.runEventHandlers();
                sprite.previousSFlags = sprite.sFlags;
            }

            this.aButtonIsPressedLastFrame = this.aButtonIsPressed.slice(0);
            this.upButtonIsPressedLastFrame = this.upButtonIsPressed.slice(0);
        }

        handleJumping() {
            const currentTime = game.runtime();

            const tilemap = game.currentScene().tileMap.data;
            let onGround = false;
            let onWall = false;
            for (const sprite of this.allSprites) {
                onGround = isOnGround(sprite, this.gravityDirection);

                if (!onGround && sprite.pFlags & PlatformerFlags.Gravity) {
                    updateWallState(sprite, this.gravityDirection, tilemap);
                }
                else {
                    sprite.setStateFlag(PlatformerSpriteState.OnWallLeft, false);
                    sprite.setStateFlag(PlatformerSpriteState.OnWallRight, false);
                }

                onWall = sprite.hasState(PlatformerSpriteState.OnWallLeft | PlatformerSpriteState.OnWallRight);

                if (onGround) {
                    sprite.jumpCount = 0;
                    sprite.lastOnGroundTime = game.runtime();
                    sprite.setStateFlag(PlatformerSpriteState.AfterJumpApex, false);
                    sprite.setStateFlag(PlatformerSpriteState.Falling, false);
                }
                else if (!sprite.hasState(PlatformerSpriteState.AfterJumpApex | PlatformerSpriteState.JumpingUp)) {
                    sprite.setStateFlag(PlatformerSpriteState.Falling, true)
                }

                sprite.setStateFlag(PlatformerSpriteState.OnGround, onGround);

                if (!onWall) {
                    sprite.setGravity(_state().gravity, _state().gravityDirection);
                    sprite.setStateFlag(PlatformerSpriteState.WallSliding, false);
                }

                const pIndex = sprite.player ? sprite.player.playerIndex - 1 : 0;

                let didJump = false;

                if (onGround || ((sprite.pFlags & PlatformerFlags.CoyoteTime) && game.runtime() - sprite.lastOnGroundTime < sprite.constants.lookupValue(PlatformerConstant.CoyoteTimeMillis))) {
                    sprite.setPlatformerFlag(PlatformerFlags.CurrentlyJumping, false);
                    sprite.setStateFlag(PlatformerSpriteState.JumpingUp, false);

                    if (sprite.jumpStartTime === undefined || currentTime - sprite.jumpStartTime > sprite.constants.lookupValue(PlatformerConstant.JumpGracePeriodMillis)) {
                        if (sprite.pFlags & PlatformerFlags.JumpOnAPressed && sprite.pFlags & PlatformerFlags.ControlsEnabled) {
                            if (currentTime - this.aButtonTimer[pIndex] < sprite.constants.lookupValue(PlatformerConstant.JumpGracePeriodMillis)) {
                                startJump(sprite, this.gravity, this.gravityDirection, sprite.constants.lookupValue(PlatformerConstant.MaxJumpHeight));
                                sprite.setPlatformerFlag(PlatformerFlags.JumpStartedWithA, true);
                                didJump = true;
                            }
                        }
                        if (sprite.pFlags & PlatformerFlags.JumpOnUpPressed && sprite.pFlags & PlatformerFlags.ControlsEnabled) {
                            if (currentTime - this.upButtonTimer[pIndex] < sprite.constants.lookupValue(PlatformerConstant.JumpGracePeriodMillis)) {
                                startJump(sprite, this.gravity, this.gravityDirection, sprite.constants.lookupValue(PlatformerConstant.MaxJumpHeight));
                                sprite.setPlatformerFlag(PlatformerFlags.JumpStartedWithA, false);
                                didJump = true;
                            }
                        }
                    }
                }
                else if (sprite.pFlags & PlatformerFlags.CurrentlyJumping) {
                    if (currentTime - sprite.jumpStartTime > sprite.timeToJumpApex()) {
                        sprite.setPlatformerFlag(PlatformerFlags.CurrentlyJumping, false);
                        sprite.setStateFlag(PlatformerSpriteState.JumpingUp, false);
                        sprite.setStateFlag(PlatformerSpriteState.AfterJumpApex, true);
                    }

                    if (sprite.pFlags & PlatformerFlags.AllowJumpCancellation) {
                        if (sprite.pFlags & PlatformerFlags.JumpOnAPressed && !this.aButtonIsPressed[pIndex] && sprite.pFlags & PlatformerFlags.JumpStartedWithA) {
                            cancelJump(sprite, this.gravityDirection);
                        }
                        if (sprite.pFlags & PlatformerFlags.JumpOnUpPressed && !this.upButtonIsPressed[pIndex] && !(sprite.pFlags & PlatformerFlags.JumpStartedWithA)) {
                            cancelJump(sprite, this.gravityDirection);
                        }
                    }
                }

                if (!didJump && !onGround && !onWall) {
                    const inAirJumps = sprite.constants.lookupValue(PlatformerConstant.InAirJumps);
                    if (inAirJumps > 0 && sprite.jumpCount <= inAirJumps) {
                        if (sprite.pFlags & PlatformerFlags.JumpOnAPressed && sprite.pFlags & PlatformerFlags.ControlsEnabled) {
                            if (this.aButtonIsPressed[pIndex] && !this.aButtonIsPressedLastFrame[pIndex]) {
                                // if we were falling
                                if (sprite.jumpCount === 0) {
                                    sprite.jumpCount = 1;
                                }
                                startJump(sprite, this.gravity, this.gravityDirection, sprite.constants.lookupValue(PlatformerConstant.InAirJumpHeight));
                                sprite.setPlatformerFlag(PlatformerFlags.JumpStartedWithA, true);
                            }
                        }
                        if (sprite.pFlags & PlatformerFlags.JumpOnUpPressed && sprite.pFlags & PlatformerFlags.ControlsEnabled) {
                            if (this.upButtonIsPressed[pIndex] && !this.upButtonIsPressedLastFrame[pIndex]) {
                                // if we were falling
                                if (sprite.jumpCount === 0) {
                                    sprite.jumpCount = 1;
                                }
                                startJump(sprite, this.gravity, this.gravityDirection, sprite.constants.lookupValue(PlatformerConstant.InAirJumpHeight));
                                sprite.setPlatformerFlag(PlatformerFlags.JumpStartedWithA, false);
                            }
                        }
                    }
                }

                let shouldApplyFriction = false;
                let didWallJump = false;

                if (sprite.pFlags & PlatformerFlags.WallJumps) {
                    switch (_state().gravityDirection) {
                        case Direction.Down:
                            shouldApplyFriction = Fx.compare(sprite._vy, Fx.zeroFx8) > 0;
                            break;
                        case Direction.Up:
                            shouldApplyFriction = Fx.compare(sprite._vy, Fx.zeroFx8) < 0;
                            break;
                        case Direction.Left:
                            shouldApplyFriction = Fx.compare(sprite._vx, Fx.zeroFx8) < 0;
                            break;
                        case Direction.Right:
                            shouldApplyFriction = Fx.compare(sprite._vx, Fx.zeroFx8) > 0;
                            break;
                    }

                    shouldApplyFriction = shouldApplyFriction && onWall;

                    if (onWall) {
                        sprite.setPlatformerFlag(PlatformerFlags.LastWallLeft, sprite.hasState(PlatformerSpriteState.OnWallLeft));
                    }

                    if (shouldApplyFriction || ((sprite.pFlags & PlatformerFlags.CoyoteTime) && game.runtime() - sprite.lastOnWallTime < sprite.constants.lookupValue(PlatformerConstant.CoyoteTimeMillis))) {
                        if (sprite.jumpStartTime === undefined || currentTime - sprite.jumpStartTime > sprite.constants.lookupValue(PlatformerConstant.JumpGracePeriodMillis)) {
                            if (sprite.pFlags & PlatformerFlags.JumpOnAPressed && sprite.pFlags & PlatformerFlags.ControlsEnabled) {
                                if (currentTime - this.aButtonTimer[pIndex] < sprite.constants.lookupValue(PlatformerConstant.JumpGracePeriodMillis)) {
                                    startJump(sprite, this.gravity, this.gravityDirection, sprite.constants.lookupValue(PlatformerConstant.WallJumpHeight), sprite.constants.lookupValue(PlatformerConstant.WallJumpKickoffVelocity));
                                    sprite.setPlatformerFlag(PlatformerFlags.JumpStartedWithA, true);
                                    didWallJump = true;
                                }
                            }
                            if (sprite.pFlags & PlatformerFlags.JumpOnUpPressed && sprite.pFlags & PlatformerFlags.ControlsEnabled) {
                                if (currentTime - this.upButtonTimer[pIndex] < sprite.constants.lookupValue(PlatformerConstant.JumpGracePeriodMillis)) {
                                    startJump(sprite, this.gravity, this.gravityDirection, sprite.constants.lookupValue(PlatformerConstant.WallJumpHeight), sprite.constants.lookupValue(PlatformerConstant.WallJumpKickoffVelocity));
                                    sprite.setPlatformerFlag(PlatformerFlags.JumpStartedWithA, false);
                                    didWallJump = true;
                                }
                            }
                        }
                    }

                    // Wall friction
                    if (onWall && !didWallJump) {
                        const friction = Fx8(sprite.constants.lookupValue(PlatformerConstant.WallFriction));
                        const minVelocity = Fx8(sprite.constants.lookupValue(PlatformerConstant.WallMinVelocity) || 0);

                        sprite.setStateFlag(PlatformerSpriteState.WallSliding, shouldApplyFriction);
                        if (shouldApplyFriction) {
                            sprite.setStateFlag(PlatformerSpriteState.JumpingUp, false);
                            sprite.setStateFlag(PlatformerSpriteState.AfterJumpApex, false);
                            sprite.setStateFlag(PlatformerSpriteState.Falling, false);
                            switch (_state().gravityDirection) {
                                case Direction.Down:
                                case Direction.Up:
                                    const c1 = Fx.compare(sprite._vy, friction);
                                    if (c1 < 0) // v < f, v += f
                                        sprite._vy = Fx.min(Fx.zeroFx8, Fx.add(sprite._vy, friction));
                                    else if (c1 > 0) // v > f, v -= f
                                        sprite._vy = Fx.max(Fx.zeroFx8, Fx.sub(sprite._vy, friction));
                                    else
                                        sprite._vy = Fx.zeroFx8

                                    if (Fx.compare(Fx.abs(sprite._vy), minVelocity) < 0) {
                                        if (Fx.compare(sprite._vy, Fx.zeroFx8) < 0) {
                                            sprite._vy = Fx.neg(minVelocity);
                                        }
                                        else {
                                            sprite._vy = minVelocity
                                        }
                                    }
                                    sprite.ay = 0;
                                    break;
                                case Direction.Left:
                                case Direction.Right:
                                    const c2 = Fx.compare(sprite._vx, friction);
                                    if (c2 < 0) // v < f, v += f
                                        sprite._vx = Fx.min(Fx.zeroFx8, Fx.add(sprite._vx, friction));
                                    else if (c2 > 0) // v > f, v -= f
                                        sprite._vx = Fx.max(Fx.zeroFx8, Fx.sub(sprite._vx, friction));
                                    else
                                        sprite._vx = Fx.zeroFx8

                                    if (Fx.compare(Fx.abs(sprite._vx), minVelocity) < 0) {
                                        if (Fx.compare(sprite._vx, Fx.zeroFx8) < 0) {
                                            sprite._vx = Fx.neg(minVelocity);
                                        }
                                        else {
                                            sprite._vx = minVelocity
                                        }
                                    }
                                    sprite.ax = 0;
                                    break;
                            }
                            if (onWall) {
                                sprite.setPlatformerFlag(PlatformerFlags.LastWallLeft, sprite.hasState(PlatformerSpriteState.OnWallLeft));
                                sprite.lastOnWallTime = game.runtime();
                            }
                        }
                    }
                    else {
                        sprite.setStateFlag(PlatformerSpriteState.WallSliding, false);
                    }
                }

                if (onGround) {
                    switch (this.gravityDirection) {
                        case Direction.Down:
                        case Direction.Up:
                            sprite.setStateFlag(PlatformerSpriteState.PushingWallLeft, sprite.isHittingTile(CollisionDirection.Left));
                            sprite.setStateFlag(PlatformerSpriteState.PushingWallRight, sprite.isHittingTile(CollisionDirection.Right));
                            break;
                        case Direction.Right:
                        case Direction.Left:
                            sprite.setStateFlag(PlatformerSpriteState.PushingWallLeft, sprite.isHittingTile(CollisionDirection.Bottom));
                            sprite.setStateFlag(PlatformerSpriteState.PushingWallRight, sprite.isHittingTile(CollisionDirection.Top));
                            break;
                    }
                }

                switch (this.gravityDirection) {
                    case Direction.Down:
                    case Direction.Up:
                        if (sprite.vx > 0 && sprite.isHittingTile(CollisionDirection.Right)) {
                            sprite.setStateFlag(PlatformerSpriteState.Accelerating, false);
                        }
                        else if (sprite.vx < 0 && sprite.isHittingTile(CollisionDirection.Left)) {
                            sprite.setStateFlag(PlatformerSpriteState.Accelerating, false);
                        }
                        break;
                    case Direction.Right:
                    case Direction.Left:
                        if (sprite.vy > 0 && sprite.isHittingTile(CollisionDirection.Bottom)) {
                            sprite.setStateFlag(PlatformerSpriteState.Accelerating, false);
                        }
                        else if (sprite.vy < 0 && sprite.isHittingTile(CollisionDirection.Top)) {
                            sprite.setStateFlag(PlatformerSpriteState.Accelerating, false);
                        }
                        break;
                }
            }
        }

        setTemplateFlag(flag: number, enabled: boolean) {
            if (enabled) this.templateFlags |= flag;
            else this.templateFlags &= ~flag;

            for (const sprite of this.allSprites) {
                sprite.setPlatformerFlag(flag, enabled);
            }
        }

        setGlobalConstant(constant: PlatformerConstant, value: number) {
            globalConstants.setValue(constant, value);
        }

        addEventHandler(rule: number, condition: EventHandlerCondition, handler: (sprite: PlatformerSprite) => void) {
            this.handlers.push(new EventHandler(rule, condition, handler));
        }
    }

    function startJump(sprite: PlatformerSprite, gravityStr: number, gravityDir: Direction, jumpHeight: number, kickoffVelocity = 0) {
        switch (gravityDir) {
            case Direction.Down:
                sprite.vy = -Math.sqrt(2 * gravityStr * jumpHeight);
                if (kickoffVelocity) {
                    if (sprite.pFlags & PlatformerFlags.LastWallLeft) {
                        sprite.vx = kickoffVelocity;
                    }
                    else {
                        sprite.vx = -kickoffVelocity;
                    }
                }
                break;
            case Direction.Up:
                sprite.vy = Math.sqrt(2 * gravityStr * jumpHeight);
                if (kickoffVelocity) {
                    if (sprite.pFlags & PlatformerFlags.LastWallLeft) {
                        sprite.vx = kickoffVelocity;
                    }
                    else {
                        sprite.vx = -kickoffVelocity;
                    }
                }
                break;
            case Direction.Right:
                sprite.vx = -Math.sqrt(2 * gravityStr * jumpHeight);
                if (kickoffVelocity) {
                    if (sprite.pFlags & PlatformerFlags.LastWallLeft) {
                        sprite.vy = kickoffVelocity;
                    }
                    else {
                        sprite.vy = -kickoffVelocity;
                    }
                }
                break;
            case Direction.Left:
                sprite.vx = Math.sqrt(2 * gravityStr * jumpHeight);
                if (kickoffVelocity) {
                    if (sprite.pFlags & PlatformerFlags.LastWallLeft) {
                        sprite.vy = kickoffVelocity;
                    }
                    else {
                        sprite.vy = -kickoffVelocity;
                    }
                }
                break;
        }

        sprite.setPlatformerFlag(PlatformerFlags.CurrentlyJumping, true);
        sprite.setStateFlag(PlatformerSpriteState.JumpingUp, true);
        sprite.setStateFlag(PlatformerSpriteState.Falling, false);
        sprite.jumpStartTime = game.runtime();
        sprite.lastOnGroundTime = - sprite.constants.lookupValue(PlatformerConstant.CoyoteTimeMillis);
        sprite.lastJumpHeight = jumpHeight;
        sprite.jumpCount++;
        sprite.clearObstacles();
    }

    function cancelJump(sprite: PlatformerSprite, gravityDir: Direction) {
        switch (gravityDir) {
            case Direction.Down:
                sprite.vy = 0
                break;
            case Direction.Up:
                sprite.vy = 0
                break;
            case Direction.Right:
                sprite.vx = 0
                break;
            case Direction.Left:
                sprite.vx = 0
                break;
        }

        sprite.setPlatformerFlag(PlatformerFlags.CurrentlyJumping, false);
        sprite.setStateFlag(PlatformerSpriteState.JumpingUp, false);
        sprite.setStateFlag(PlatformerSpriteState.AfterJumpApex, true);
    }

    function isOnGround(sprite: Sprite, gravityDir: Direction) {
        switch (gravityDir) {
            case Direction.Down:
                return sprite.isHittingTile(CollisionDirection.Bottom);
            case Direction.Up:
                return sprite.isHittingTile(CollisionDirection.Top);
            case Direction.Right:
                return sprite.isHittingTile(CollisionDirection.Right);
            case Direction.Left:
                return sprite.isHittingTile(CollisionDirection.Left);
        }
    }

    function updateWallState(sprite: PlatformerSprite, gravityDir: Direction, tilemap: tiles.TileMapData) {
        let leftDirection: CollisionDirection;
        let rightDirection: CollisionDirection;

        switch (gravityDir) {
            case Direction.Down:
            case Direction.Up:
                leftDirection = CollisionDirection.Left;
                rightDirection = CollisionDirection.Right;
                break;
            case Direction.Right:
            case Direction.Left:
                leftDirection = CollisionDirection.Top;
                rightDirection = CollisionDirection.Bottom;
                break;
        }

        if (sprite.isHittingTile(leftDirection)) {
            sprite.setStateFlag(PlatformerSpriteState.OnWallLeft, true);
            sprite.setStateFlag(PlatformerSpriteState.OnWallRight, false);
            return;
        }
        else if (sprite.isHittingTile(rightDirection)) {
            sprite.setStateFlag(PlatformerSpriteState.OnWallRight, true);
            sprite.setStateFlag(PlatformerSpriteState.OnWallLeft, false);
            return;
        }

        const left = (sprite.left - 1) >> tilemap.scale;
        const right = sprite.right >> tilemap.scale;
        const top = (sprite.top - 1) >> tilemap.scale;
        const bottom = sprite.bottom >> tilemap.scale;

        if (sprite.hasState(PlatformerSpriteState.OnWallLeft)) {
            if (gravityDir === Direction.Down || gravityDir === Direction.Up) {
                for (let i = top; i <= bottom; i++) {
                    if (tilemap.isWall(left, i) || tilemap.isOutsideMap(left, i)) {
                        sprite.setStateFlag(PlatformerSpriteState.OnWallLeft, true);
                        return;
                    }
                }
            }
            else {
                for (let i = left; i <= right; i++) {
                    if (tilemap.isWall(i, top) || tilemap.isOutsideMap(i, top)) {
                        sprite.setStateFlag(PlatformerSpriteState.OnWallLeft, true);
                        return;
                    }
                }
            }
            sprite.setStateFlag(PlatformerSpriteState.OnWallLeft, false);
        }

        if (sprite.hasState(PlatformerSpriteState.OnWallRight)) {
            if (gravityDir === Direction.Down || gravityDir === Direction.Up) {
                for (let i = top; i <= bottom; i++) {
                    if (tilemap.isWall(right, i) || tilemap.isOutsideMap(right, i)) {
                        sprite.setStateFlag(PlatformerSpriteState.OnWallRight, true);
                        return;
                    }
                }
            }
            else {
                for (let i = left; i <= right; i++) {
                    if (tilemap.isWall(i, bottom) || tilemap.isOutsideMap(i, bottom)) {
                        sprite.setStateFlag(PlatformerSpriteState.OnWallRight, true);
                        return;
                    }
                }
            }
        }

        sprite.setStateFlag(PlatformerSpriteState.OnWallRight, false);
    }

    function init() {
        if (stateStack) return;
        stateStack = [new PlatformerState()];

        game.addScenePushHandler(() => {
            stateStack.push(new PlatformerState());
        });

        game.addScenePopHandler(() => {
            stateStack.pop();

            if (stateStack.length === 0) {
                stateStack.push(new PlatformerState());
            }
        });
    }

    export function _state() {
        init();
        return stateStack[stateStack.length - 1];
    }

    export function _assertPlatformerSprite(sprite: Sprite) {
        if (!isPlatformerSprite(sprite)) {
            throw "arcade-platformer functions can only be used on Platformer Sprites!";
        }
    }

    export function isPlatformerSprite(sprite: Sprite) {
        return sprite instanceof PlatformerSprite;
    }
}
