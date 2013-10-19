from datetime import datetime, timedelta
from dateutil import parser as dateparser
from pymongo import MongoClient
from hashlib import md5
import sunburnt
import requests
import ignore
import re
import pdb
from bs4 import BeautifulSoup as bs

base_url = "http://cmj2013.sched.org"

restws_fields = ['genre1','genre2','genre3','name','popularity','origin','mood']

def get_dates():
    start = dateparser.parse('2013-10-15')
    end = dateparser.parse('2013-10-20')
    day = timedelta(days = 1)
    cur_day = start

    while cur_day != (end + day):
        yield cur_day.strftime('%Y-%m-%d')
        cur_day+=day

def get_rows(day_url):
    pass

def clean_time(time_str,day_str):
    """
    should return start and end date times
    """
    times =  time_str.replace('&nbsp;&ndash;&nbsp;',' - ').replace('&nbsp;','').split(' - ')
    if times[0] == 'TBA':
        return (None,None)

    start = dateparser.parse(times[0] + day_str)
    stop = dateparser.parse(times[1] + day_str)
    if stop < start:
        stop += timedelta(days = 1)

    return start,stop

def parse_row(row,date):
    row = row.replace('\r\n','')
    data={}
    time  = re.findall('<td class="time"><span>(?P<time>.*?)\s*</span></td>',row)
    if time:
        start,stop = clean_time(time[0],date)
        data['start_time'] = start and start.isoformat()
        data['stop_time'] = stop and stop.isoformat()
    
    event_type = re.findall('<td class="type"><span>(?P<type>.*?)</span></td>',row)
    if event_type:
        data['event_type'] = event_type[0]

    match = re.search('<a href="(?P<url>.*?)".*?>(?P<name>.*?) <span class=\'vs\'>(?P<venue>.*?)</span>',row,re.DOTALL)
    if match:
        m = match.groupdict()
        data['url'] = "%s%s" % (base_url,m['url'])
        data['name'] = m['name']
        data['venue'] = m['venue']

        
    description = re.search('<div class="sched-description">(?P<description>.*?)</div',row)
    if description:
        data['description'] = description.groups()[0]

    roles = re.search('<em class="sched-role-list">(?P<role>.*?)</em>',row)

    if roles:
        role_key = roles.groups()[0].split(':')[0].lower()
        role_val = roles.groups()[0].split(':')[1]
        data[role_key] = role_val
    return data


def get_shows():
    mat = []
    for date in get_dates():
        url = "%s/%s/print/all/" % (base_url,date)
        resp = requests.get(url)
        page = resp.text

        rows = []

        for row in re.findall('<tr>\s*(.*?)\s*</tr>',page,re.DOTALL):
            data = parse_row(row,date)
            rows.append(row)
            if data:
                mat.append(data)
    return mat

def get_metadata(artist_name):
    url = "%s/artist/search" % (ignore.restws_base)
    params = {'q':'name:' + artist_name,
              'field':'all',
              'format':'json',
              'limit':1}
              
    resp = requests.get(url,params = params)
    if not resp.ok:
        return {}
    
    json = resp.json()['response'][0]
        
    if json['score'] < 0.9:
        return {}

    out = {}
    metadata = json['metadata']

    for field in restws_fields:
        if metadata.get(field,'-1') != '-1':
            out[field] = metadata[field]
    return out

def solr_dict(d):
    newd = {}
    fields = ['event_type','name','venue','speakers','description','sponsors','moderators'] + restws_fields
    for key in fields:
        if key in d:
            newd[key+'_t'] = d[key]

    return newd

def get_solr_conn():
    return sunburnt.SolrInterface(ignore.solr_url)

def get_mongo_db():
    client = MongoClient(ignore.mongo_host,27017)
    db = client['cmj']
    return db

def gen_mongo_id():
    return md5(datetime.now().isoformat()).hexdigest()

def populate_mongo():
    db = get_mongo_db()
    solr = get_solr_conn()

    shows = get_shows()
    try:
        for show in shows:
            md = get_metadata(show['name'])
            data = dict(md,**show)
            search_data = solr_dict(data)

            mongo_id = gen_mongo_id()
            data['_id'] = mongo_id
            search_data['id'] = mongo_id

            db.shows.insert(data)
            solr.add(search_data)
    except Exception as e:
        pdb.set_trace()
    solr.commit()

def query_4sq(name):
    base = "https://api.foursquare.com/v2/venues/search"
    params = {"query":name,
              "ll":"40.7,-74",
              "v":"20131018",
              "oauth_token":ignore.foursquare_key}
    
    resp = requests.get(base,params=params)
    if not resp.ok:
        return None

    json = resp.json()
    if not len(json['response']['venues']):
        return None

    return json['response']['venues'][0]['location']

def shows_per_venue(venue):
    db = get_mongo_db()
    return list(db.shows.find({'venue':venue}))

def get_lat_lng():
    db = get_mongo_db()
    venues = db.shows.distinct('venue')
    no_loc_data = []
    for venue in venues:
        loc = query_4sq(venue)
        if loc:
            shows = shows_per_venue(venue)
            for show in shows:
                show['lat'] = loc['lat']
                show['lng'] = loc['lng']
                show['city'] = loc['city']

                db.shows.save(show)
        else:
            no_loc_data.append(venue)

    return

def get_spotify_artist_uri(artist):
    url = "http://ws.spotify.com/search/1/artist.json"
    params = {'q':artist}
    resp = requests.get(url,params=params)
    if not resp.ok:
        return None
    json = resp.json()
    if not json['artists']:
        return None

    return json['artists'][0]['href']

def add_spotify_artist_uris():
    db = get_mongo_db()
    uris = {}
    shows = db.shows.find()
    for show in shows:
        name = show['name']
        uri = None
        if name in uris:
            uri = uris[name]
        else:
            uri = get_spotify_artist_uri(name)
            uris[name] = uri

        if uri:
            show['artist_uri'] = uri
            db.shows.save(show)

def cleanup_hours():
    db = get_mongo_db()
    shows = db.shows.find()
    offset = timedelta(hours=6)
    
    for show in shows:
        start = show['start_time']
        if not start:
            continue
        time = dateparser.parse(start)
        time = time - offset
        show['date'] = str(time.day)

        db.shows.save(show)

def get_top_tracks(artist_uri):
    num_tracks = 5
    
    a_id = uri.split(':')[-1]
    url = "http://open.spotify.com/artist/" + a_id
    resp = requests.get(url)
    if not resp.ok:
        return []

    soup = bs(resp.text)
    tracks = soup.find(id='tracks')
    links = tracks.find_all('a')
    uris = []
    for link in links:
        if link['href'].startswith('/track/'):
            uris.append(link['href'].split('/')[-1])
        if len(uris) == num_tracks:
            break
    return uris

def set_artist_tracks():     
    db = get_mongo_db()
    for show in db.shows.find({'artist_uri': {'$exists': True}}):
        uri = show['artist_uri']
        tracks = get_top_tracks(uri)
        doc = {'_id':'artist:'+show['name'],'tracks':tracks}
        db.tracks.save(doc)




    
