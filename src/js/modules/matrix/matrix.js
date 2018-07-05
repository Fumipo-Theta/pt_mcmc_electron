/** 行列インスタンスを生成するジェネレーター
 * 
 * 
 * Correspondance between Matrix sturucture and Array structure
 * [
 * 	[a11 a12 a13],
 * 	[a21 a22 a23],
 * 	[a31 a32 a33]
 * ]
*/

(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    // AMD. Register as an anonymous module.
    define([], factory);
  } else if (typeof exports === 'object') {
    // Node. Does not work with strict CommonJS, but
    // only CommonJS-like environments that support module.exports,
    // like Node.
    module.exports = factory();
  } else {
    // Browser globals (root is window)
    root.Matrix = factory();
  }
}(this, function () {



  var Matrix = function (matrix = null, rowNum, columnNum) {
    this.m = [];

    if (matrix) {
      if (Matrix.isMatrix(matrix)) {
        this.rowNum = matrix.length;
        this.columnNum = matrix[0].length;
        this.m = matrix;
      } else {
        return false;
      }

    } else {
      for (let i = 0; i < rowNum; i = (i + 1) | 0) {
        this.m[i] = [];
        for (let j = 0; j < columnNum; j = (j + 1) | 0) {
          this.m[i][j] = 0.0;
        };
      };

      this.rowNum = rowNum;
      this.columnNum = columnNum;
    }
  };

  Matrix.isMatrix = function (array) {
    if (Array.isArray(array)) {
      return array.map((a) => Array.isArray(a)).reduce((a, b) => (a && b) ? true : false);
    } else {
      return false
    }
  }

  Matrix.prototype.getRowNum = function () {
    return this.rowNum;
  };

  Matrix.prototype.getColumnNum = function () {
    return this.columnNum;
  }

  //>> 行列の掛け算を行う関数
  Matrix.multiple = function (matA, matB) {
    //>> 引数の行列サイズが不正ならエラーを返す
    if (matA.getColumnNum() != matB.getRowNum()) {
      alert("multipleMatrix: Invarid matrix size !");
      return
    }

    let rowNum = matA.getRowNum();
    let columnNum = matB.getColumnNum();
    let iterNum = matA.getColumnNum();
    let resultMat = new Matrix(null, rowNum, columnNum);



    for (let i = 0; i < rowNum; i = (i + 1) | 0) {
      for (let j = 0; j < columnNum; j = (j + 1) | 0) {
        for (let k = 0; k < iterNum; k = (k + 1) | 0) {
          resultMat.m[i][j] = resultMat.m[i][j] + matA.m[i][k] * matB.m[k][j];
        }
      }
    }
    return resultMat;
  };

  //>> 行列の足し算を行う関数
  Matrix.add = function (matA, matB, f = 1.) {
    if (matA.getRowNum() != matB.getRowNum() || matA.getColumnNum() != matB.getColumnNum()) {
      console.log("addMatrix: Invarid matrix size !")
      return
    }

    let rowNum = matA.getRowNum();
    let columnNum = matA.getColumnNum();
    let resultMat = new Matrix(null, rowNum, columnNum);

    for (let i = 0; i < rowNum; i = (i + 1) | 0) {
      for (let j = 0; j < columnNum; j = (j + 1) | 0) {
        resultMat.m[i][j] = matA.m[i][j] + matB.m[i][j] * f;
      }
    }

    return resultMat;
  };

  //>> 逆行列を返す関数
  Matrix.inverse = function (mat, eps) {
    if (mat.getRowNum() != mat.getColumnNum()) {
      console.log("inverseMatrix: Invarid matrix size!")
      return
    }

    let rowNum = mat.getRowNum();
    let columnNum = mat.getColumnNum();
    let invMat = new Matrix(null, rowNum, columnNum);
    let tempMat = new Matrix(null, rowNum, columnNum);

    //>> Initialize
    for (let i = 0; i < rowNum; i = (i + 1) | 0) {
      for (let j = 0; j < columnNum; j = (j + 1) | 0) {
        tempMat.m[i][j] = mat.m[i][j];
        if (i == j) {
          invMat.m[i][j] = 1.0;
        } else {
          invMat.m[i][j] = 0.0;
        }
      }
    }

    //>> Pivot transformation
    for (let pv = 0; pv < rowNum; pv = (pv + 1) | 0) {
      let big = 0.0;
      let pv_big = pv;

      for (let i = pv; i < rowNum; i = (i + 1) | 0) {
        if (Math.abs(tempMat.m[i][pv]) > big) {
          big = Math.abs(tempMat.m[i][pv]);
          pv_big = i;
        }
      }

      for (let j = 0; j < columnNum; j = (j + 1) | 0) {
        let temp = tempMat.m[pv][j];
        tempMat.m[pv][j] = tempMat.m[pv_big][j];
        tempMat.m[pv_big][j] = temp;

        temp = invMat.m[pv][j];
        invMat.m[pv][j] = invMat.m[pv_big][j];
        invMat.m[pv_big][j] = temp;
      }

      if (big <= eps) {
        console.log("inverseMatrix: There is no inverse matrix !");
        return
      }

      let amp = tempMat.m[pv][pv];

      for (let j = 0; j < columnNum; j = (j + 1) | 0) {
        tempMat.m[pv][j] = tempMat.m[pv][j] / amp;
        invMat.m[pv][j] = invMat.m[pv][j] / amp;
      }

      for (let i = 0; i < rowNum; i = (i + 1) | 0) {
        amp = tempMat.m[i][pv];
        for (let j = 0; j < columnNum; j = (j + 1) | 0) {
          if (i != pv) {
            tempMat.m[i][j] = tempMat.m[i][j] - tempMat.m[pv][j] * amp;
            invMat.m[i][j] = invMat.m[i][j] - invMat.m[pv][j] * amp;
          }
        }
      }

    }

    return invMat;
  };

  /** SOR
   * 
   */

  Matrix.SOR = function (A, v, eps = 1e-6, w = 1.) {
    let dX = 1;
    let absX = 1;
    let raw = A.getRowNum();
    let col = A.getColumnNum();
    let x = new Matrix(null, raw, 1);
    let k = 0;
    while (dX / absX > eps) {
      dX = 0;
      absX = 0;
      for (i = 0; i < raw; i++) {
        let sum = 0;
        for (j = 0; j < col; j++) {
          if (i !== j) {
            sum += A.m[i][j] * x.m[j][0];
          }
        }

        let newX = 1. / A.m[i][i] * (v.m[i][0] - sum);
        dX += Math.abs(newX - x.m[i][0]);
        absX += Math.abs(newX);
        x.m[i][0] += w * (newX - x.m[i][0]);
        k++
      }
    }
    console.log(k++)
    return x;
  }

  Matrix.transpose = function (mat) {
    //if (! Matrix.isMatrix(mat)) return false

    let rowNum = mat.getRowNum();
    let columnNum = mat.getColumnNum();

    let tMat = new Matrix(null, columnNum, rowNum);

    for (let i = 0; i < rowNum; i++) {
      for (let j = 0; j < columnNum; j++) {
        tMat.m[j][i] = mat.m[i][j];
      }
    }

    return tMat;
  }

  return Matrix;
}));
