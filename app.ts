/// <reference path="glMatrix.d.ts" />

enum DrawStyle {
    Nearest,
    Bilinear
}

// Class Point
class Point {
    constructor(public x: number, public y: number) { }
}

class Point3D {
    constructor(public x: number, public y: number, public z: number) { }
}

// イメージ読込クラス
class ImagesLoaded {

    // コンストラクタ
    constructor(public imageList) { }

    loader(items: string[], allDone: Function) {
        if (!items) return;

        var count: number = items.length;

        // イメージ読込完了コールバック
        var thingToDoCompleted = (items) => {
            count--;
            if (0 == count) {
                // 全て読込完了
                allDone(items);
            }
        }

        for (var i: number = 0; i < items.length; i++) {
            // 各イメージ読込
            this.loadImage(items, i, thingToDoCompleted);
        }
    }

    // イメージ読込処理
    loadImage(items: string[], i: number, onComplete: Function) {
        var onLoad = (e) => {
            e.target.removeEventListener("load", onLoad);
            // イメージ読込完了
            onComplete(items);
        }

        // イメージ格納
        var img = new Image();
        img.addEventListener("load", onLoad, false);
        img.src = items[i];
        this.imageList.push(img);
    }
}

// 射影変換(ホモグラフィ)クラス
class Homography {

    private origin = [];
    private points = [];
    private imageData: ImageData;

    public static drawStyle = DrawStyle.Nearest;

    // コンストラクタ
    constructor(public image: HTMLImageElement) { }

    // 射影変換パラメータ取得(8次元連立方程式の8x8行列を4x4行列と2x2行列を組み合わせて解く)
    // http://sourceforge.jp/projects/nyartoolkit/document/tech_document0001/ja/tech_document0001.pdf
    getParam = function (src, dest): number[] {
        // X1 Y1 -X1x1 -Y1x1  A   x1 - C
        // X2 Y2 -X2x2 -Y2x2  B = x2 - C
        // X3 Y3 -X3x3 -Y3x3  G   x3 - C
        // X4 Y4 -X4x4 -Y4x4  H   x4 - C

        var Z = function (val) { return val == 0 ? 0.5 : val; };

        var X1: number = Z(src[0][0]);
        var X2: number = Z(src[1][0]);
        var X3: number = Z(src[2][0]);
        var X4: number = Z(src[3][0]);
        var Y1: number = Z(src[0][1]);
        var Y2: number = Z(src[1][1]);
        var Y3: number = Z(src[2][1]);
        var Y4: number = Z(src[3][1]);

        var x1: number = Z(dest[0][0]);
        var x2: number = Z(dest[1][0]);
        var x3: number = Z(dest[2][0]);
        var x4: number = Z(dest[3][0]);
        var y1: number = Z(dest[0][1]);
        var y2: number = Z(dest[1][1]);
        var y3: number = Z(dest[2][1]);
        var y4: number = Z(dest[3][1]);

        var tx: Float32Array = mat4.create(new Float32Array([
            X1, Y1, -X1 * x1, -Y1 * x1, // 1st column
            X2, Y2, -X2 * x2, -Y2 * x2, // 2nd column
            X3, Y3, -X3 * x3, -Y3 * x3, // 3rd column
            X4, Y4, -X4 * x4, -Y4 * x4  // 4th column
        ]));

        mat4.inverse(tx);

        // A = tx11x1 + tx12x2 + tx13x3 + tx14x4 " C(tx11 + tx12 + tx13 + tx14)
        // B = tx21x1 + tx22x2 + tx32x3 + tx42x4 " C(tx21 + tx22 + tx23 + tx24)
        // G = tx31x1 + tx23x2 + tx33x3 + tx43x4 " C(tx31 + tx32 + tx33 + tx34)
        // H = tx41x1 + tx24x2 + tx34x3 + tx44x4 " C(tx14 + tx24 + tx34 + tx44)
        var kx1: number = tx[0] * x1 + tx[1] * x2 + tx[2] * x3 + tx[3] * x4;
        var kc1: number = tx[0] + tx[1] + tx[2] + tx[3];
        var kx2: number = tx[4] * x1 + tx[5] * x2 + tx[6] * x3 + tx[7] * x4;
        var kc2: number = tx[4] + tx[5] + tx[6] + tx[7];
        var kx3: number = tx[8] * x1 + tx[9] * x2 + tx[10] * x3 + tx[11] * x4;
        var kc3: number = tx[8] + tx[9] + tx[10] + tx[11];
        var kx4: number = tx[12] * x1 + tx[13] * x2 + tx[14] * x3 + tx[15] * x4;
        var kc4: number = tx[12] + tx[13] + tx[14] + tx[15];

        //Y point
        var ty: Float32Array = mat4.create(new Float32Array([
            X1, Y1, -X1 * y1, -Y1 * y1, // 1st column
            X2, Y2, -X2 * y2, -Y2 * y2, // 2nd column
            X3, Y3, -X3 * y3, -Y3 * y3, // 3rd column
            X4, Y4, -X4 * y4, -Y4 * y4  // 4th column
        ]));

        mat4.inverse(ty);

        // A = tx11x1 + tx12x2 + tx13x3 + tx14x4 " C(tx11 + tx12 + tx13 + tx14)
        // B = tx21x1 + tx22x2 + tx32x3 + tx42x4 " C(tx21 + tx22 + tx23 + tx24)
        // G = tx31x1 + tx23x2 + tx33x3 + tx43x4 " C(tx31 + tx32 + tx33 + tx34)
        // H = tx41x1 + tx24x2 + tx34x3 + tx44x4 " C(tx14 + tx24 + tx34 + tx44)
        var ky1: number = ty[0] * y1 + ty[1] * y2 + ty[2] * y3 + ty[3] * y4;
        var kf1: number = ty[0] + ty[1] + ty[2] + ty[3];
        var ky2: number = ty[4] * y1 + ty[5] * y2 + ty[6] * y3 + ty[7] * y4;
        var kf2: number = ty[4] + ty[5] + ty[6] + ty[7];
        var ky3: number = ty[8] * y1 + ty[9] * y2 + ty[10] * y3 + ty[11] * y4;
        var kf3: number = ty[8] + ty[9] + ty[10] + ty[11];
        var ky4: number = ty[12] * y1 + ty[13] * y2 + ty[14] * y3 + ty[15] * y4;
        var kf4: number = ty[12] + ty[13] + ty[14] + ty[15];

        var det_1: number = kc3 * (-kf4) - (-kf3) * kc4;
        if (det_1 == 0) { det_1 = 0.0001; }

        det_1 = 1 / det_1;
        var param = new Array(8);
        var C: number = (-kf4 * det_1) * (kx3 - ky3) + (kf3 * det_1) * (kx4 - ky4);
        var F: number = (-kc4 * det_1) * (kx3 - ky3) + (kc3 * det_1) * (kx4 - ky4);

        param[2] = C;             // C
        param[5] = F;             // F
        param[6] = kx3 - C * kc3; // G
        param[7] = kx4 - C * kc4; // G
        param[0] = kx1 - C * kc1; // A
        param[1] = kx2 - C * kc2; // B
        param[3] = ky1 - F * kf1; // D
        param[4] = ky2 - F * kf2; // E

        return param;
    }

    // 描画用の射影変換パラメータ取得
    computeH(src, dest, size: number): number[] {

        // 射影変換パラメータ取得
        var param = this.getParam(src, dest);
        if (isNaN(param[0])) return null;

        // 描画用に射影変換の逆行列パラメータにする
        var mx = mat4.create(new Float32Array([
            param[0], param[1], param[2], 0,    // 1st column
            param[3], param[4], param[5], 0,    // 2nd column
            param[6], param[7], 1, 0,           // 3rd column
            0, 0, 0, 1                          // 4th column
        ]));

        // 逆行列パラメータ取得
        mat4.inverse(mx);

        var inv_param = new Array(9);
        inv_param[0] = mx[0];
        inv_param[1] = mx[1];
        inv_param[2] = mx[2];
        inv_param[3] = mx[4];
        inv_param[4] = mx[5];
        inv_param[5] = mx[6];
        inv_param[6] = mx[8];
        inv_param[7] = mx[9];
        inv_param[8] = mx[10];

        // 規格外値は対象外とする
        if (isNaN(inv_param[0]) || Math.abs(inv_param[8]) > size) return null;

        return inv_param;
    }

    // 最近傍補間（ニアレストネイバー Nearest neighbor)
    drawNearest(ctx: CanvasRenderingContext2D, param, sx: number, sy: number, w: number, h: number) {
        var imgW = this.image.width;
        var imgH = this.image.height;
        var output = ctx.createImageData(w, h);
        for (var i = 0; i < h; ++i) {
            for (var j = 0; j < w; ++j) {
                // u = (x*a + y*b + c) / (x*g + y*h + 1)
                // v = (x*d + y*e + f) / (x*g + y*h + 1)
                var tmp = j * param[6] + i * param[7] + param[8];
                var tmpX = (j * param[0] + i * param[1] + param[2]) / tmp;
                var tmpY = (j * param[3] + i * param[4] + param[5]) / tmp;

                var floorX = (tmpX + 0.5) | 0;
                var floorY = (tmpY + 0.5) | 0;

                if (floorX >= 0 && floorX < imgW && floorY >= 0 && floorY < imgH) {
                    var pixelData = this.getPixel(this.imageData, floorX, floorY, imgW, imgH);
                    var R = pixelData.R;
                    var G = pixelData.G;
                    var B = pixelData.B;
                    var A = pixelData.A;
                    this.setPixel(output, j, i, R, G, B, A);
                }
            }
        }

        // ImageDataを描画
        ctx.putImageData(output, sx, sy);
    }

    // 双一次補間（バイリニア補間 Bilinear）
    drawBilinear(ctx: CanvasRenderingContext2D, param, sx: number, sy: number, w: number, h: number) {
        var imgW = this.image.width;
        var imgH = this.image.height;
        var output = ctx.createImageData(w, h);
        for (var i = 0; i < h; ++i) {
            for (var j = 0; j < w; ++j) {
                //u = (x*a + y*b + c) / (x*g + y*h + 1)
                //v = (x*d + y*e + f) / (x*g + y*h + 1)
                var tmp = j * param[6] + i * param[7] + param[8];
                var tmpX = (j * param[0] + i * param[1] + param[2]) / tmp;
                var tmpY = (j * param[3] + i * param[4] + param[5]) / tmp;

                var floorX = tmpX | 0;
                var floorY = tmpY | 0;

                if (floorX >= 0 && floorX < imgW && floorY >= 0 && floorY < imgH) {
                    // それぞれの方向からどの割合で足し合わせるか計算
                    var dx = tmpX - floorX;
                    var dy = tmpY - floorY;

                    var rgb00 = this.getPixel(this.imageData, floorX, floorY, imgW, imgH);
                    var rgb10 = this.getPixel(this.imageData, floorX + 1, floorY, imgW, imgH);
                    var rgb01 = this.getPixel(this.imageData, floorX, floorY + 1, imgW, imgH);
                    var rgb11 = this.getPixel(this.imageData, floorX + 1, floorY + 1, imgW, imgH);

                    var r0 = (rgb00.R * (1 - dx)) + (rgb10.R * dx);
                    var r1 = (rgb01.R * (1 - dx)) + (rgb11.R * dx);
                    var R = (r0 * (1 - dy) + r1 * dy) | 0;

                    var g0 = (rgb00.G * (1 - dx)) + (rgb10.G * dx);
                    var g1 = (rgb01.G * (1 - dx)) + (rgb11.G * dx);
                    var G = (g0 * (1 - dy) + g1 * dy) | 0;

                    var b0 = (rgb00.B * (1 - dx)) + (rgb10.B * dx);
                    var b1 = (rgb01.B * (1 - dx)) + (rgb11.B * dx);
                    var B = (b0 * (1 - dy) + b1 * dy) | 0;

                    var A = rgb00.A;
                    this.setPixel(output, j, i, R, G, B, A);
                }
            }
        }

        // ImageDataを描画
        ctx.putImageData(output, sx, sy);
    }

    // 描画色を取得
    getPixel(imageData, x: number, y: number, w: number, h: number) {
        if (x == w) { x = w - 1; }
        if (y == h) { y = h - 1; }

        var pixels = imageData.data;
        var index = (imageData.width * y * 4) + (x * 4);
        if (index < 0 || index + 3 > pixels.length) { return undefined; }

        return { R: pixels[index + 0], G: pixels[index + 1], B: pixels[index + 2], A: pixels[index + 3] };
    }

    // 描画色をセット
    setPixel(imageData, x: number, y: number, r: number, g: number, b: number, a: number) {
        var pixels = imageData.data;
        var index = (imageData.width * y * 4) + (x * 4);
        if (index < 0 || index + 3 > pixels.length) { return false; }

        pixels[index + 0] = r;
        pixels[index + 1] = g;
        pixels[index + 2] = b;
        pixels[index + 3] = a;

        return true;
    }

    // イメージデータ格納
    setImageData(ctx: CanvasRenderingContext2D) {

        ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
        ctx.drawImage(this.image, 0, 0);
        this.imageData = ctx.getImageData(0, 0, this.image.width, this.image.height);
    }

    // 描画処理
    draw(ctx: CanvasRenderingContext2D, inv_param, w: number, h: number) {

        // 画像処理(非表示画面に描画)
        if (Homography.drawStyle == DrawStyle.Nearest) {
            // ニアレストネイバー
            this.drawNearest(ctx, inv_param, 0, 0, w, h);
        } else {
            // バイリニア補間
            this.drawBilinear(ctx, inv_param, 0, 0, w, h);
        }
    }
}

// 透視行列クラス
class PvmMatrix {

    private _wx: number;
    private _wy: number;

    private matrix: Float32Array;
    private pMatrix: Float32Array;
    private vMatrix: Float32Array;

    public mMatrix: Float32Array;

    // Constructor
    constructor(wx: number, wy: number, fovy: number, aspect: number) {
        this._wx = wx;
        this._wy = wy;

        this.matrix = mat4.identity(mat4.create());
        this.pMatrix = mat4.perspective(fovy, aspect, 0.1, 100.0);
        this.vMatrix = mat4.lookAt(new Float32Array([0, 0, 4.5]), new Float32Array([0, 0, 0]), new Float32Array([0, -1, 0]));
        this.mMatrix = mat4.identity(mat4.create());
    }

    set() {
        var i: number;
        var len: number;
        var ref = [];
        var results = [];

        this.matrix = mat4.identity(mat4.create());
        ref = [this.pMatrix, this.vMatrix, this.mMatrix];

        results = [];
        for (i = 0, len = ref.length; i < len; i++) {
            results.push(mat4.multiply(this.matrix, ref[i]));
        }

        return results;
    }

    transform(vec: Float32Array) {
        vec = vec3.create(vec);
        mat4.multiplyVec3(this.matrix, vec);
        
        return new Point3D((vec[0] / vec[2] + 0.5) * this._wx, (vec[1] / vec[2] + 0.5) * this._wy, vec[2]);
    }
}

class Plane {

    private pvmx: PvmMatrix;
    private mvMatrix: Float32Array;

    public depth: number;
    public origin = [];
    public points = [];
    public vetrix = [];
    public z: number;
    public min: Point = new Point(0, 0);
    public max: Point = new Point(0, 0);
    public offset: Float32Array;
    public static isPreserve3D: boolean = true;
    public static aspect: number;

    constructor(wx: number, wy: number, wz: number, fovy: number) {

        this.pvmx = new PvmMatrix(wx, wy, fovy, Plane.aspect);

        // 頂点
        if (wz < 0) {
            this.vetrix = [[-1, 1, wz], [1, 1, wz], [1, -1, wz], [-1, -1, wz]];
        }
        else {
            this.vetrix = [[1, 1, wz], [-1, 1, wz], [-1, -1, wz], [1, -1, wz]];
        }

        // 奥行き
        this.depth = wz;
        // 原点座標
        this.origin = [[0, 0], [wx, 0], [wx, wy], [0, wy]];
        // 表示座標
        this.points = [[0, 0], [wx, 0], [wx, wy], [0, wy]];
        // Zソート用
        this.z = 0;
        // 平行移動値
        this.offset = new Float32Array([0, 0, 0]);
    }

    // 回転
    rotate(angle: number, axis: Float32Array) {

        var mvMatrix = mat4.identity(mat4.create());
        mat4.translate(mvMatrix, this.offset)

        this.pvmx.mMatrix = mat4.rotate(mvMatrix, angle, axis);
        this.pvmx.set();

        this.z = 0;
        var len: number;
        for (var i: number = 0, len = this.vetrix.length; i < len; i++) {
            var vec: Float32Array = vec3.create(this.vetrix[i]);
            vec[2] = (Plane.isPreserve3D == true) ? vec[2] : vec[2] / 100;

            var pt = this.pvmx.transform(vec);
            this.points[i][0] = pt.x;
            this.points[i][1] = pt.y;
            // Zソート用
            this.z += (pt.z + this.offset[2]);
        }

        // 自由変形のため、画像サイズを取得用に4角から最小値と最大値を求める
        for (var i: number = 0; i < this.points.length; i++) {
            var x = this.points[i][0];
            var y = this.points[i][1];
            if (x > this.max.x) { this.max.x = x; }
            if (y > this.max.y) { this.max.y = y; }
            if (x < this.min.x) { this.min.x = x; }
            if (y < this.min.y) { this.min.y = y; }
        }
    }
}

// 軸クラス
class Axis extends Plane {

    private style;
    private ax;

    constructor(wx: number, wy: number, ax: string, fovy: number, style: any) {
        super(wx, wy, 0, fovy);

        // 頂点
        this.ax = ax;
        switch (ax) {
            case 'x':
                this.vetrix = [[-1, 0, 0], [1, 0, 0], [1, 0, 0], [-1, 0, 0]];
                break;
            case 'y':
                this.vetrix = [[0, -1, 0], [0, 1, 0], [0, 1, 0], [0, -1, 0]];
                break;
            case 'z':
                this.vetrix = [[0, 0, -1], [0, 0, 1], [0, 0, 1], [0, 0, -1]];
                break;
        }
        this.style = style;
    }

    // 軸描画処理
    draw(ctx: CanvasRenderingContext2D, x: number, y: number) {
        if (Plane.isPreserve3D == false && this.ax == 'z') return;

        var x1 = (x + this.points[0][0]) | 0;
        var y1 = (y + this.points[0][1]) | 0;
        var x2 = (x + this.points[1][0]) | 0;
        var y2 = (y + this.points[1][1]) | 0;

        // 軸描画
        ctx.save();
        ctx.beginPath();
        ctx.lineWidth = 0.5;
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.closePath();
        ctx.strokeStyle = this.style;
        ctx.stroke();
        ctx.restore();
    }
}

// 平面3Dクラス
class Plane3D extends Plane {

    private style;
    private homography: Homography;

    public offset: Float32Array;
    public visible: boolean = true;
    public static backCanvas: HTMLCanvasElement;
    public static drawStyle: DrawStyle;

    static backCtx: CanvasRenderingContext2D;

    constructor(wx: number, wy: number, wz: number, fovy: number, offset: Float32Array, style: any, homography?: Homography) {
        super(wx, wy, wz, fovy);

        this.offset[0] = -offset[0];
        this.offset[1] = -offset[1];
        this.offset[2] = offset[2];

        this.style = style;
        this.homography = homography;
        Plane3D.backCtx = Plane3D.backCanvas.getContext("2d");
    }

    drawPlane(ctx: CanvasRenderingContext2D, x: number, y: number) {

        ctx.save();
        ctx.beginPath();
        ctx.moveTo(x + this.points[0][0], y + this.points[0][1])
        ctx.lineTo(x + this.points[1][0], y + this.points[1][1])
        ctx.lineTo(x + this.points[2][0], y + this.points[2][1])
        ctx.lineTo(x + this.points[3][0], y + this.points[3][1])
        ctx.lineTo(x + this.points[0][0], y + this.points[0][1])
        ctx.closePath();

        ctx.globalAlpha = 0.3;
        ctx.fillStyle = this.style;
        ctx.fill();

        ctx.restore();
    }

    drawImage(ctx: CanvasRenderingContext2D, x: number, y: number) {

        // 描画サイズ
        var size: Point = new Point(this.max.x - this.min.x, this.max.y - this.min.y);

        Plane3D.backCanvas.width = size.x;
        Plane3D.backCanvas.height = size.y;

        // 射影変換用に左上を原点(0,0)にするため移動(最小値分)
        var points = [[0, 0], [0, 0], [0, 0], [0, 0]];
        for (var i: number = 0; i < points.length; i++) {
            points[i][0] = this.points[i][0] - this.min.x;
            points[i][1] = this.points[i][1] - this.min.y;
        }
        // 描画用の射影変換パラメータを取得
        var inv_param = this.homography.computeH(this.origin, points, size.x * size.y);

        if (inv_param != null) {
            Homography.drawStyle = Plane3D.drawStyle;
            this.homography.draw(Plane3D.backCtx, inv_param, size.x, size.y);

            // 非表示画面から表示画面に転送
            var newimage: HTMLImageElement = new Image();
            newimage.src = Plane3D.backCanvas.toDataURL();
            ctx.drawImage(newimage, x, y);
        }
    }

    draw(ctx: CanvasRenderingContext2D, x: number, y: number) {
        if (this.homography != null) {
            // 画像(射影変換で最小値分移動したのを表示時に元位置に戻す)
            this.drawImage(ctx, x + this.min.x, y + this.min.y);
        }
        else {
            // 図形
            this.drawPlane(ctx, x, y);
        }
    }
}

class Rotate3DApp {
    private context: CanvasRenderingContext2D;
    private context2: CanvasRenderingContext2D;

    private theta: number;
    private width: number;
    private height: number;
    private offset = new Point(100, 150);
    private imgItems = ['mdnface.png', 'htmlface.png'];
    private imageList = [];
    private planes = [];
    private axis = [];

    private ctlHeight: number;
    private thetaBar: HTMLInputElement;
    private drawStyle: HTMLInputElement[];
    private preserve3D: HTMLInputElement;
    private frontLogo: HTMLInputElement;
    private backLogo: HTMLInputElement;

    // コンストラクタ
    constructor(canvas: HTMLCanvasElement, canvas2: HTMLCanvasElement) {

        this.width = canvas.width = 465;    //window.innerWidth;
        this.height = canvas.height = 465;  //window.innerHeight;
        this.context = canvas.getContext("2d");
        this.context2 = canvas2.getContext("2d");

        Plane3D.backCanvas = canvas2;
        canvas2.width = this.width;
        canvas2.height = this.height;

        // コントローラの高さ
        this.ctlHeight = document.getElementById('controler').offsetHeight;

        // 描画方法(ラジオボタン)の変更イベントの設定
        this.drawStyle = (<HTMLInputElement[]><any>document.getElementsByName('drawStyle'));
        for (var i = 0; i < this.drawStyle.length; i++) {
            this.drawStyle[i].addEventListener("click", (e) => {
                var radioBtn: HTMLInputElement = <HTMLInputElement>e.currentTarget;
                Plane3D.drawStyle = (radioBtn.value == DrawStyle[0].toString()) ? DrawStyle.Nearest : DrawStyle.Bilinear;
                this.render();
            });
        }

        // シータ(範囲スライダー)の変更イベントの設定
        this.thetaBar = <HTMLInputElement>document.getElementById('theta');
        this.thetaBar.addEventListener("change", (e) => {
            var thetaDisp = <HTMLInputElement>document.getElementById('thetaDisp');
            thetaDisp.innerHTML = this.thetaBar.value;

            this.theta = parseInt(this.thetaBar.value);
            this.render();
        })

        // 3D表現使用有無
        this.preserve3D = <HTMLInputElement>document.getElementById('preserve3D');
        this.preserve3D.addEventListener("change", (e) => {
            Plane.isPreserve3D = this.preserve3D.checked;
            this.render();
        });

        // BackLogo表示有無
        this.backLogo = <HTMLInputElement>document.getElementById('backlogo');
        this.backLogo.addEventListener("change", (e) => {
            for (var i: number = 0; i < this.planes.length; i++) {
                var plane3D: Plane3D = this.planes[i];
                if (plane3D.depth < 0) break;
            }
            plane3D.visible = this.backLogo.checked;
            this.render();
        });

        // FrontLogo表示有無
        this.frontLogo = <HTMLInputElement>document.getElementById('frontlogo');
        this.frontLogo.addEventListener("change", (e) => {
            for (var i: number = 0; i < this.planes.length; i++) {
                var plane3D: Plane3D = this.planes[i];
                if (plane3D.depth > 0) break;
            }
            plane3D.visible = this.frontLogo.checked;
            this.render();
        });

       // イメージ読込
        var imgLoaded = new ImagesLoaded(this.imageList);
        imgLoaded.loader(this.imgItems, (() => this.onImagesLoaded()));
    }

    // 全画像ロード完了
    onImagesLoaded() {
        // 前方ロゴ
        var frontLogo = new Homography(this.imageList[0]);
        frontLogo.setImageData(this.context2);
        // 後方ロゴ
        var backLogo = new Homography(this.imageList[1]);
        backLogo.setImageData(this.context2);

        // 3D表現使用有無
        Plane.isPreserve3D = true;
        // アスペクト
        Plane.aspect = this.width / this.height;

        // 前方ロゴサイズを大きさの基準とする
        var w = this.imageList[0].width;
        var h = this.imageList[0].height;

        // 平面3Dクラス設定
        this.planes.push(new Plane3D(w, h, -1, 60, new Float32Array([0, 0, 0]), '', backLogo));
        this.planes.push(new Plane3D(w, h,  0, 60, new Float32Array([0, 0, 0]), 'blue', null));
        this.planes.push(new Plane3D(w, h,  1, 60, new Float32Array([0, 0, 0]), '', frontLogo));

        // 軸クラス設定
        this.axis.push(new Axis(w, h, 'x', 35, 'blue'));
        this.axis.push(new Axis(w, h, 'y', 35, 'green'));
        this.axis.push(new Axis(w, h, 'z', 35, 'red'));

        // 初回描画
        this.theta = 0;
        this.render();

        // タイマー
        setInterval((() => this.onFrame()), 1000 / 60);
    }

    // 回転方向取得
    getNormValue(id: string): number {
        var chkX: HTMLInputElement = <HTMLInputElement>document.getElementById(id);
        return (chkX.checked) ? 1 : 0;
    }

    // 描画処理
    render() {
        var ctx: CanvasRenderingContext2D = this.context;

        var chkX: number = this.getNormValue("rotateX");
        var chkY: number = this.getNormValue("rotateY");
        var chkZ: number = this.getNormValue("rotateZ");

        var norm = vec3.normalize(new Float32Array([-chkX, -chkY, chkZ]));

        // 描画クリア
        ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

        // Zソート
        this.planes.sort(function (a, b) {
            return b["z"] - a["z"];
        });

        // オブジェクト描画
        for (var i: number = 0; i < this.planes.length; i++) {
            // 平面描画
            var plane3D: Plane3D = this.planes[i];
            if (plane3D.visible) {
                var angle = this.theta * Math.PI / 180;
                plane3D.rotate(angle, norm);
                plane3D.draw(ctx, this.offset.x, (this.offset.y - this.ctlHeight));
            }

            if (plane3D.depth == 0) {
                // XYZ軸描画
                for (var j: number = 0; j < this.axis.length; j++) {
                    var axis: Axis = this.axis[j];
                    axis.rotate(angle, norm);
                    axis.draw(ctx, this.offset.x, (this.offset.y - this.ctlHeight));
                }
            }
        }
    }

    // 毎回フレーム
    onFrame() {
        var loop: HTMLInputElement = <HTMLInputElement>document.getElementById("loop");
        if (loop.checked) {
            this.theta++;
            this.theta %= 360;
            this.render();
        }
    }
}

window.onload = () => {
    var app = new Rotate3DApp(<HTMLCanvasElement>document.getElementById('ctx'),
                              <HTMLCanvasElement>document.getElementById('ctx2'));
};
