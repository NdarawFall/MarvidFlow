// LOGO DOWNLOADER - 100% gratuit, sans cle, sans limite
// Sources: Iconify (SVG couleur) + Google Favicons (PNG fallback)
//
// Usage: node 05_Scripts/brandfetch.cjs <domaine>
// Ex:    node 05_Scripts/brandfetch.cjs nvidia.com
//        node 05_Scripts/brandfetch.cjs apple.com google.com netflix.com
//
// Les logos sont sauvegardes dans 01_Assets/Logos/

var path=require('path'),fs=require('fs'),https=require('https'),http=require('http');
var LOGOS_DIR=path.join(__dirname,'..','01_Assets','Logos');

function httpGet(url){
  return new Promise(function(ok,ko){
    var mod=url.startsWith('https')?https:http;
    mod.get(url,{headers:{'User-Agent':'Mozilla/5.0'}},function(res){
      if(res.statusCode===301||res.statusCode===302) return httpGet(res.headers.location).then(ok).catch(ko);
      var c=[]; res.on('data',function(x){c.push(x);}); res.on('end',function(){
        ok({s:res.statusCode,b:Buffer.concat(c),t:res.headers['content-type']||''});
      });
    }).on('error',ko);
  });
}

function save(buf,dest){
  if(!fs.existsSync(path.dirname(dest))) fs.mkdirSync(path.dirname(dest),{recursive:true});
  fs.writeFileSync(dest,buf);
  return dest;
}

// Iconify logos collection (logos, thesvg-color, simple-icons SVG haute qualite)
function fromIconify(domain){
  var slug=domain.replace(/\.(?:com|net|org|io|gov|fr|co|ai|dev|app)$/i,'').toLowerCase().replace(/[\s_]/g,'-');
  var collections=['logos','thesvg-color','simple-icons'];
  return collections.reduce(function(p,col){
    return p.then(function(found){
      if(found) return found;
      var url='https://api.iconify.design/'+col+'/'+slug+'.svg';
      console.log('[Iconify:'+col+'] '+url);
      return httpGet(url).then(function(r){
        if(r.s===200&&r.t.indexOf('svg')!==-1&&r.b.length>100){
          var dest=save(r.b,path.join(LOGOS_DIR,slug+'.svg'));
          console.log('[OK] 01_Assets/Logos/'+path.basename(dest)+' (SVG '+col+')');
          return dest;
        }
        return null;
      }).catch(function(){return null;});
    });
  }, Promise.resolve(null)).then(function(res){
    if(!res) console.log('[Info] Iconify: logo non trouve pour '+slug);
    return res;
  });
}

// Google Favicons (PNG, universel - fonctionne pour tous les sites)
function fromGoogle(domain){
  var url='https://www.google.com/s2/favicons?domain='+domain+'&sz=256';
  console.log('[Google Favicons] '+url);
  return httpGet(url).then(function(r){
    if(r.s===200&&r.t.indexOf('image')!==-1){
      var slug=domain.replace(/\./g,'_');
      var ext=r.t.indexOf('png')!==-1?'png':'ico';
      var dest=save(r.b,path.join(LOGOS_DIR,slug+'_favicon.'+ext));
      console.log('[OK] 01_Assets/Logos/'+path.basename(dest)+' (favicon PNG)');
      return dest;
    }
    console.log('[Info] Google: aucun favicon trouve');
    return null;
  }).catch(function(e){console.log('[Info] Google erreur: '+e.message);return null;});
}

async function downloadLogo(domain){
  console.log('\n=== '+domain+' ===');
  if(!fs.existsSync(LOGOS_DIR)) fs.mkdirSync(LOGOS_DIR,{recursive:true});
  // Essaie Iconify en premier (SVG couleur de qualite)
  var r=await fromIconify(domain);
  // Fallback: Google Favicons
  if(!r) r=await fromGoogle(domain);
  if(!r) console.log('[Echec] Aucun logo trouve pour: '+domain);
  return r;
}

async function main(){
  var args=process.argv.slice(2);
  if(!args.length){
    console.log('');
    console.log('LOGO DOWNLOADER - Gratuit, sans cle, sans limite');
    console.log('Usage: node 05_Scripts/brandfetch.cjs <domaine> [domaine2...]');
    console.log('');
    console.log('Exemples:');
    console.log('  node 05_Scripts/brandfetch.cjs nvidia.com');
    console.log('  node 05_Scripts/brandfetch.cjs apple.com google.com netflix.com');
    console.log('');
    console.log('Sources:');
    console.log('  1. Iconify  - SVG couleur (https://icon-sets.iconify.design/logos/)');
    console.log('  2. Google   - PNG favicon (fallback universel)');
    process.exit(0);
  }
  var results=[];
  for(var i=0;i<args.length;i++){
    var f=await downloadLogo(args[i]);
    results.push({d:args[i],f:f});
  }
  if(args.length>1){
    console.log('\nResultats:');
    results.forEach(function(r){
      console.log('  '+r.d.padEnd(25)+' -> '+(r.f?'OK  '+path.basename(r.f):'Echec'));
    });
  }
  process.exit(0);
}
main().catch(function(e){console.error('[Fatal]',e);process.exit(1);});
