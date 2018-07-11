'use strict';

var electron = require('electron');
var app = electron.app;
var BrowserWindow = electron.BrowserWindow;

var mainWindow = null;

app.on('window-all-closed', function() {
  if (process.platform != 'darwin')
    app.quit();
});

app.on('ready', function() {

  // ブラウザ(Chromium)の起動, 初期画面のロード
  mainWindow = new BrowserWindow({width: 1200, height: 900});
  mainWindow.loadURL('file://' + __dirname + '/createProfiles.html');
  
  mainWindow.openDevTools();	// デフォルトで開発ツールを開く

  mainWindow.on('closed', function() {
    mainWindow = null;
  });
});