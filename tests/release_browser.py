"""Run from the repository root with Python Playwright and Chromium installed."""
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from shutil import which
from tempfile import TemporaryDirectory
from threading import Thread

from playwright.sync_api import sync_playwright


class QuietHandler(SimpleHTTPRequestHandler):
    def log_message(self, *args):
        pass


root = Path(__file__).resolve().parents[1]
server = ThreadingHTTPServer(("127.0.0.1", 0), partial(QuietHandler, directory=root))
Thread(target=server.serve_forever, daemon=True).start()
try:
    with sync_playwright() as playwright, TemporaryDirectory() as downloads:
        browser = playwright.chromium.launch(executable_path=which("chromium"), args=["--enable-unsafe-swiftshader"])
        page = browser.new_page()
        errors = []
        page.on("pageerror", lambda error: errors.append(str(error)))
        page.route("https://**/*", lambda route: route.abort())
        page.add_init_script("window.name='NG_ENABLE_DEBUG_INFO!'; window.game=()=>angular.element(document.body).scope().zm;")
        page.goto(f"http://127.0.0.1:{server.server_port}", wait_until="networkidle")
        page.wait_for_function("game()?.model")
        assert page.locator("canvas").count()
        assert page.evaluate("game().model.level") == 1
        page.evaluate("""() => {
          const z=game(), m=z.model;
          localStorage.setItem('ZombieData', 'legacy sentinel');
          m.persistentData.levelUnlocked=501;
          m.startLevel(501);
          z.levelSelect.shown=true;
          angular.element(document.body).scope().$apply();
        }""")
        page.get_by_role("button", name="Enter trial at frontier level 500 or higher").evaluate("b=>b.click()")
        page.wait_for_function("game().model.humans.aliveHumans.length > 0")
        # Accelerate combat through the actual damage handler, leaving victory and rewards to the game loop.
        page.wait_for_function("""() => {
          const m=game().model;
          if (m.persistentData.realmSeals) return true;
          for (const enemy of m.humans.aliveHumans) {
            if (!enemy.flags.dead) m.humans.damageHuman(enemy, enemy.health);
          }
          return false;
        }""", timeout=60000)
        assert page.evaluate("game().model.persistentData.prestigePointsToSpend") == 25
        page.evaluate("""()=>{const z=game();z.levelSelect.shown=true;angular.element(document.body).scope().$apply()}""")
        page.get_by_role("button", name="First Spark", exact=False).evaluate("b=>b.click()")
        page.evaluate("""()=>{const z=game();z.levelSelect.shown=false;z.sidePanels.options=true;z.model.downloadSaveGame();angular.element(document.body).scope().$apply()}""")
        with page.expect_download() as download:
            page.locator("a[download]").evaluate("link=>link.click()")
        path = Path(downloads) / "roundtrip.sav"
        download.value.save_as(path)
        page.evaluate("""()=>{const m=game().model;delete m.persistentData.soulMemory;m.persistentData.realmSeals=0;m.saveData()}""")
        page.locator("#import-file").set_input_files(path)
        page.wait_for_function("game().model.persistentData.soulMemory === 'spark'")
        page.reload(wait_until="networkidle")
        assert page.evaluate("""()=>{const m=game().model;return [m.persistentData.soulMemory,m.persistentData.realmSeals,m.energyMax-m.baseStats.energyMax,localStorage.getItem('ZombieData')]}""") == ["spark", 1, 5, "legacy sentinel"]
        page.evaluate("""()=>{const z=game();z.sidePanels.options=true;z.model.autoUpgrades=true;angular.element(document.body).scope().$apply()}""")
        for label in ["Pause purchases", "Resume purchases"]:
            page.get_by_role("button", name=label).evaluate("button=>button.click()")
        page.evaluate("""()=>{const z=game(), sk=z.model.skeleton;sk.persistent.skeletons=1;sk.persistent.xpRate=2;
          const a=z.generateStrappedItem(1,1,5), b=z.generateStrappedItem(1,1,6);
          a.q=true;sk.persistent.items=[a,b];z.skeletonMenu.isShown=true;z.skeletonMenu.tab='inventory';
          z.skeletonMenu.updateEquippedItems();angular.element(document.body).scope().$apply()}""")
        assert "level 5" in page.locator("#champ-hold .items").text_content()
        assert "720 xp" in page.locator("#champ-hold .items").text_content()
        assert page.evaluate("""()=>{const m=game().model, factory=m.creatureFactory, creature=factory.creatures[2];creature.level=10;
          const expected=factory.creatureStats(creature).thisLevel;factory.spawnCreature(creature);
          const unit=m.creatures.creatures.at(-1);
          return unit.level===10 && unit.attackDamage===expected.damage && unit.health===expected.health}""")
        # Compare actual game stats at each boundary using independent prepared frontiers.
        for seals, frontier, expected in [(0, 500, [0.5, 1, 1]), (1, 900, [1, 2, 1]),
                                          (2, 1250, [1, 1, 0.5]), (8, 2500, [1, 2, 0.5])]:
            result = page.evaluate("""([seals,level]) => {
              const m=game().model,d=m.persistentData;
              d.realmSeals=seals; delete d.realmTrial; delete d.deepRealmClears;
              m.level=d.levelUnlocked=level-1; m.enterDarkRealm();
              if(d.realmTrial || m.nextRealmLevel!==level) throw Error("Incorrect trial gate");
              m.level=d.levelUnlocked=level; m.resetToBaseStats();
              const base=[m.zombieDamage,m.zombieCost,m.zombieHealth];
              m.enterDarkRealm();m.resetToBaseStats();
              const ratios=[m.zombieDamage,m.zombieCost,m.zombieHealth].map((n,i)=>n/base[i]);
              m.finishDarkRealm();m.finishDarkRealm();
              if(d.realmSeals!==seals+1) throw Error("Incorrect reward");
              if(level===2500 && (d.deepRealmClears!==1 || m.nextRealmLevel!==2750)) throw Error("Deep Realm progression");
              return ratios;
            }""", [seals, frontier])
            assert result == expected, (frontier, result)
        assert page.evaluate("""()=>{const m=game().model,d=m.persistentData;
          d.realmSeals=2; d.realmTrial=m.level=125;delete d.realmRule;
          delete d.progressionVersion;d.creatureLevels=[0,10];d.soulMemory='scholar';d.necropolis={ossuary:true};
          m.migrateSave();m.finishDarkRealm();return d.realmSeals===3 && d.legacyEvolutions.includes(1)
            && d.soulMemory==='scholar' && d.necropolis.ossuary && !d.realmTrial}""")
        assert not errors, errors
        browser.close()
        print("Passed fresh start, Dark Realm victory, Soul Archive, file export/import and reload.")
finally:
    server.shutdown()
    server.server_close()
