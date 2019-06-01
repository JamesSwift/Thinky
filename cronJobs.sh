#!/bin/bash
cd ~/www

#Create cached versions of common views
nodejs scraper.js > cache/scraper.log