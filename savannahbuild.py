# SavannahBuild.py
import urllib, urllib2

server = 'http://majurojs.herokuapp.com';
src = "philadelphia"
cbuild = open('phillybuild.kml', 'r')

count = 0
skiptocount = 0

timepoint = {
  "lat": 0,
  "lng": 0,
  "src": src,
  "points": ""
}

for line in cbuild:
  #print line

  if(line.find('<coordinates>') > -1):
    coordinates = line[ line.find('<coordinates>') + 13 : line.find('</coordinates>') ]
    coordinates = coordinates.split(' ')
    avglng = 0
    avglat = 0
    for pt in range(0, len(coordinates) ):
      coordinates[pt] = coordinates[pt].split(',')
      coordinates[pt][0] = str( round( float( coordinates[pt][0] ), 7) )
      coordinates[pt][1] = str( round( float( coordinates[pt][1] ), 7) )
      avglng = avglng + float( coordinates[pt][0] )
      avglat = avglat + float( coordinates[pt][1] )
      coordinates[pt] = '|'.join(coordinates[pt])
    avglng = avglng / len(coordinates)
    avglat = avglat / len(coordinates)
    timepoint['lat'] = avglat
    timepoint['lng'] = avglng
    
    coordinatestring = '||'.join(coordinates)
    timepoint['points'] = coordinatestring
    #print "At " + str(avglat) + ", " + str(avglng)

  if(line.find('</Placemark>') > -1):
    
    # resume adding buildings after first [count] buildings
    count = count + 1
    if(count <= skiptocount):
      continue
    
    print count

    data = urllib.urlencode(timepoint)
    urllib2.urlopen(urllib2.Request(server + '/timeline', data)).read()
    
    timepoint = {
      "lat": 0,
      "lng": 0,
      "src": src,
      "points": ""
    }