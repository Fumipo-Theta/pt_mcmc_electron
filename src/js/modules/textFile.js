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
    root.textFile = factory();
  }
}(this, function () {

  const getDelimiter = fileType => {
    switch (fileType) {
      case "csv":
        return ","
        break;
      case "tsv":
        return "\t"
        break;
      default:
        return " "
        break;
    }
  }

  class textFile {
    constructor() { }


    /* text2Object
         prop0 , prop1 , prop2 , ... 
         v00, v01, v02, ...
         v10, v11, V12, ...
       	
         ->
         
         [
           {key:0,value:{
             prop0: v00,
             prop1: v01,
             ...
           }},
           {key:1,value:{
             prop0: v10,
             prop1: v11,
             ...
           }},
           ...
         ]
       */
    static text2Object(content, fileType) {
      //>> tsvファイルから配列を作成(tsvObj)
      var obj = new Array();

      if (content.match(/\r/)) var raw = content.split("\r\n");
      else raw = content.split("\n");

      if (fileType == 'tsv') var delimiter = '\t';
      else if (fileType == 'csv') delimiter = ',';
      else delimiter = ' ';

      var rawNum = raw.length;
      var key = raw[0].replace(/"/g, '').split(delimiter);
      var columnNum = key.length;

      //console.log(key);

      for (i = 1; i < rawNum; i++) {
        column = raw[i].replace(/"/g, '').split(delimiter);
        if (column.length < columnNum) break;
        obj.push({ "key": i - 1, "value": Object() });
        for (var j = 0; j < columnNum; j++) {
          obj[i - 1]["value"][key[j]] = column[j];
        };
      };

      return obj;
    }


    /* csv2Json
      prop , subprop1 , subprop2 , ... 
      prop1, subprop11, subprop22, ...
      prop2, subprop21, subprop22, ...
    	
      to (primaryKey = "prop")
    	
      {
        prop1:{
          subprop1:subprop11,
          subprop2:subprop22,
          ...
        },
        prop2:{
          subprop1: subprop21,
          subprop2: subprop22,
          ...
        },
        ...
      }
    */
    static csv2Json(content, primaryKey = null, separator = ",") {
      let obj = {}

      const row = (content.match(/\r/)) ?
        content.split("\r\n") : content.split("\n");

      const rowNum = row.length;
      const key = row[0].replace(/"/g, '').split(separator);
      const columnNum = key.length;

      const pK = (key.indexOf(primaryKey) > -1) ? key.indexOf(primaryKey) : 0;

      for (let i = 1; i < rowNum; i++) {


        column = row[i].replace(/"/g, '').split(separator);
        obj[column[pK]] = {};
        if (column.length < columnNum) break;

        for (let j = 0; j < columnNum; j++) {
          if (j !== pK) obj[column[pK]][key[j]] = column[j];
        }
      }
      return obj;
    }



    static text2Array(content, fileType) {
      //>> tsvファイルから配列を作成(tsvObj)
      var array = new Array();

      if (content.match(/\r/)) var raw = content.split("\r\n");
      else raw = content.split("\n");

      if (fileType == 'tsv') var delimiter = '\t';
      else if (fileType == 'csv') delimiter = ',';
      else delimiter = ' ';

      var rawNum = raw.length;
      var key = raw[0].replace(/"/g, '').split(delimiter);
      var columnNum = key.length;

      //console.log(key);

      for (i = 0; i < rawNum; i++) {
        column = raw[i].replace(/"/g, '').split(delimiter);

        if (column.length < columnNum) break;
        array[i] = [];
        for (var j = 0; j < columnNum; j++) {
          array[i][j] = column[j];
        };
      };

      return array;
    };

    /** text2Dataframe
     *
     * column0,column1,...
     *  d00, d10,
     *  d01, d11
     * 
     * ->
     * 
     * df = {
           column0 : [d00,d01,],
           column1 : [d10,d11,],
           ...
      }
    */
    static text2Dataframe(content, fileType) {
      const obj = {};

      const row = (content.match(/\r/))
        ? content.split("\r\n")
        : content.split("\n");

      const delimiter = getDelimiter(fileType);

      const rawNum = row.length;
      const key = row[0].replace(/"/g, '').split(delimiter);
      const columnNum = key.length;

      key.map(v => {
        obj[v] = []
      });

      //console.log(key);

      for (let i = 1; i < rawNum; i++) {
        let column = row[i].replace(/"/g, '').split(delimiter);

        if (column.length < columnNum) break;

        for (var j = 0; j < columnNum; j++) {
          obj[key[j]].push(column[j]);
        };
      };

      return obj
    }

    static array2Text(array, fileType) {
      let blob = '';

      if (fileType == 'tsv') var delimiter = '\t';
      else if (fileType == 'csv') delimiter = ',';
      else delimiter = ' ';

      end = new RegExp(delimiter + "$");

      array.map((v) => {
        blob += '"' + v.toString().replace('"', '') + '"';
        blob += delimiter;
      })


      blob = blob.replace(end, '');

      return blob;
    }

    /* obj2Table
     * オブジェクトから markdownの表を作成する
     * 
     * obj : {
           index0:{
                  column0:v00,
                  column1:v01
            },
         index1:{
              column0:v10,
              column1:v11
          }
      }
    	
      =>
    	
      |       |column0|column1|
      | :---: | :---: | :---: |
      |index0 |  v00  |  v01  |
      |index1 |  v10  |  v11  |
    */


    static obj2Table(obj) {
      let str = ""
      const index = Object.keys(obj)
      const column = Object.keys(obj[index[0]]);

      str += "| |";
      for (let key of column) {
        str += key + "|";
      }
      str += "\n";
      str += "|:---:|";
      for (let key of column) {
        str += ":---:|";
      }
      str += "\n";

      for (let key of index) {
        str += "|" + key + "|";
        for (let c of column) {
          str += obj[key][c] + "|"
        }
        str += "\n"
      }
      return str;
    }

  }


  return textFile;

}));