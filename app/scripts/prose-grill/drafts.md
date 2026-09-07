# ✍️ drafts · 0026 prose grill

Every draft, sentence by sentence: `[F3,F7]` cited lines · ⚠️ audit "partial" · ❌ audit "unsupported" · 🟠 orphan claim (no line states it) · 🙈 hand mark (would embarrass the app). Audit = Sonnet 5. Region Mainz-Bingen.


## V0 · claude-sonnet-5

### Amsel · *Turdus merula* · de (bird, 16 lines) · validator ✓ · 0.88 ¢ · judge pppusss · orphans 5
> Die Amsel ist ein Singvogel mit einer Spannweite von rund 36 cm und einem Gewicht von etwa 100 g. [F2,F10,F6] ⚠️ 🟠 Sie ist tagsüber aktiv und lebt bevorzugt in Wäldern sowie am Boden. [F8,F7] ⚠️ 🟠 In Mainz-Bingen ist sie das ganze Jahr über zu beobachten, mit den meisten Meldungen im Winter, besonders im Januar und Dezember, und einem leichten Rückgang im Spätsommer. [F14] ⚠️ 🟠 Als Standvogel bleibt sie ganzjährig in ihrer Region, was das über das Jahr verteilte Vorkommen erklärt. [F11] ❌ 🟠
>
> Die Amsel ist ein Allesfresser und nimmt neben tierischer Kost auch verschiedene Pflanzen wie Vogelknöterich, Rotbuche, Klatschmohn oder Echten Beinwell zu sich. [F5,F13] Die Jungvögel werden nach etwa 365 Tagen geschlechtsreif, und freilebende Tiere können bis zu 21,8 Jahre alt werden. [F12,F9] Nach der Einschätzung der IUCN gilt die Art derzeit als nicht gefährdet. [F4]
- s1 partial: 'Singvogel' (Passeriformes as songbird) not explicitly stated in facts, only order Passeriformes given in F1 which is not cited here
- s1 🟠 Amsel ist ein Singvogel
- s2 partial: 'bevorzugt' (preference) added, not stated in facts
- s2 🟠 bevorzugt diese Lebensräume
- s3 partial: 'Winter' and 'Spätsommer' interpretive labels not in facts, though roughly consistent with numbers
- s3 🟠 meiste Meldungen im Winter · leichter Rückgang im Spätsommer
- s4 unsupported: kausale Erklärung ('was das ... erklärt') wird durch keine Zeile gestützt
- s4 🟠 das erklärt das ganzjährige Vorkommen

### Amsel · *Turdus merula* · en (bird, 16 lines) · validator ✓ · 0.72 ¢ · judge sppssp · orphans 5
> The Common blackbird, known in German as Amsel, is a bird of the order Passeriformes weighing around 100 g with a wingspan of about 36 cm. [F1,F2,F3,F6,F10] You can meet it on the ground and along forest edges, active by day, as it stays resident year-round rather than migrating away. [F7,F8,F11] ⚠️ 🟠 In Mainz-Bingen it is recorded throughout the year, with sightings peaking in January and December and staying strong through late autumn and winter, while numbers dip lowest in August. [F14] ⚠️ 🟠
>
> It is an omnivore, feeding on a wide range of plants such as Beech, Wood Avens, Common Comfrey, Ranunculus ficaria, Corn poppy and Black poplar, among many others. [F5,F13] Young birds reach maturity at about one year old, and in the wild this species can live up to nearly 22 years. [F12,F9] Its conservation status is listed as least concern, reflecting a stable and widespread population. [F4] ⚠️ 🟠
- s2 partial: 'along forest edges' and 'ground' are broader than cited habitat categories; framing as consequence ('rather than migrating away') adds causal spin not stated.
- s2 🟠 found along forest edges
- s3 partial: 'staying strong through late autumn and winter' and 'peaking in January and December' overstate the data; peak is January only per percentages, December is not the second peak explicitly stated as such but is high; 'lowest in August' is supported.
- s3 🟠 sightings peak in December · numbers strong through late autumn and winter
- s6 partial: 'reflecting a stable and widespread population' is an added interpretation not stated by the LC status line.
- s6 🟠 population is stable · population is widespread

### Kleiner Feuerfalter · *Lycaena phlaeas* · de (insect, 11 lines) · validator ✓ · 0.97 ¢ · judge ppuss · orphans 4
> Der Kleine Feuerfalter (Lycaena phlaeas) ist ein kleiner Schmetterling aus der Ordnung der Lepidoptera. [F1,F2] ⚠️ 🟠 In Mainz-Bingen lässt er sich vor allem von April bis Oktober beobachten, mit deutlichen Flugwellen im April und Mai sowie einem starken Höhepunkt im September und noch hohen Werten im Juli, August und Oktober. [F8] ⚠️ 🟠 Im Winter von November bis Februar zeigt das Monatsprofil dagegen keine Meldungen, der Falter ist dann nicht unterwegs. [F8] ❌ 🟠
>
> Die Raupen fressen unter anderem an Vogel-Wicke, Wiesen-Sauerampfer und Zypressen-Wolfsmilch, während die erwachsenen Falter Blüten wie Kanadische Goldrute, Ringelblume, Möhre und Hundsrose besuchen und dabei bestäuben. [F4,F6,F7] Als Nahrung dient der Art wiederum zahlreichen Vögeln, darunter Rauchschwalbe, Star, Haussperling und Mönchsgrasmücke. [F5]
- s1 partial: 'kleiner Schmetterling' (size/descriptor) not stated in facts
- s1 🟠 ist klein
- s2 partial: interpretive terms 'Flugwellen' and 'Höhepunkt' go beyond raw percentage data, though roughly consistent
- s2 🟠 deutliche Flugwellen im April und Mai · starker Höhepunkt im September
- s3 unsupported: claims 'nicht unterwegs' as causal behavioural conclusion not stated; also Feb value not part of stated months but consistent zero, but January-February included fine; the added interpretive claim 'ist dann nicht unterwegs' is unsupported
- s3 🟠 Falter ist dann nicht unterwegs

### Kleiner Feuerfalter · *Lycaena phlaeas* · en (insect, 11 lines) · validator ✓ · 0.83 ¢ · judge ppusp · orphans 4
> The Small Copper, known in German as Kleiner Feuerfalter, is a small butterfly belonging to the insects (Lepidoptera). [F1,F2,F3] ⚠️ 🟠 In Mainz-Bingen it is seen mainly from April to May and again from July to October, with numbers rising sharply in spring and peaking in September. [F8] ⚠️ 🟠 You are most likely to spot it fluttering low over meadows and field edges where it visits flowers such as thistles, buttercups, crane's-bills and vetches. [F7] ❌ 🟠
>
> Its caterpillars feed on plants like sorrel, tufted vetch, cypress spurge and knotweed, while the adults sip nectar from flowers such as lesser celandine, ivy, dog rose and Queen Anne's Lace, which they also help pollinate. [F4,F6,F7] This butterfly in turn serves as food for many garden and farmland birds, including the barn swallow, house sparrow, common starling and Eurasian blackcap. [F5] ⚠️ 🟠
- s1 partial: 'small butterfly' size not stated; Lepidoptera is order not equivalent to insects generally but acceptable rounding for class; treat size as unsupported addition
- s1 🟠 Es ist klein
- s2 partial: 'rising sharply in spring' and 'peaking in September' are interpretive claims beyond raw percentages; peak month is indeed September so that part is supported, but 'rising sharply' is an added description
- s2 🟠 Zahlen steigen im Frühling stark an
- s3 unsupported: habitat description ('low over meadows and field edges') not stated in any line; only flower-visit list is supported
- s3 🟠 Fliegt niedrig über Wiesen und Feldränder
- s5 partial: 'garden and farmland birds' is an added categorization not stated in the line
- s5 🟠 Diese Vögel sind Garten- und Feldvögel

### Fliegenpilz · *Amanita muscaria* · de (fungus, 10 lines) · validator ✓ · 0.68 ¢ · judge pspsp · orphans 3
> Der Fliegenpilz ist ein auffälliger Pilz aus der Klasse der Agaricomycetes mit weißem Sporenpulver. [F1,F2,F5] ⚠️ 🟠 In Mainz-Bingen wird er vor allem im Oktober gemeldet, mit einem Nebengipfel im November und vereinzelten Funden im September, März und Mai. [F8]
>
> Der Fliegenpilz gilt als giftig und psychoaktiv, sollte also nicht gegessen werden. [F4] ⚠️ 🟠 Gefressen wird er unter anderem vom Waldmistkäfer und vom Tigerschnegel. [F6] Auf ihm siedeln Pilze wie Hypomyces hyalinus, während Chalciporus piperatus, der Pfeffer-Röhrling, ebenfalls als mit ihm verbunden geführt wird. [F7] ⚠️ 🟠
- s1 partial: 'auffällig' ist eine nicht belegte Eigenschaft
- s1 🟠 Fliegenpilz ist auffällig
- s3 partial: Handlungsempfehlung 'sollte nicht gegessen werden' ist nicht belegt
- s3 🟠 Fliegenpilz sollte nicht gegessen werden
- s5 partial: Chalciporus piperatus ist laut F7 nicht als Röhrling-Bezeichnung oder Beziehung spezifiziert; 'siedeln' und 'verbunden' übergehen die genaue Beziehung 'Wirt von'
- s5 🟠 Chalciporus piperatus heißt Pfeffer-Röhrling

### Fliegenpilz · *Amanita muscaria* · en (fungus, 10 lines) · validator ✓ · 0.67 ¢ · judge ssppuup · orphans 5
> The Fly Agaric is a fungus with a white spore print, easy to recognise once you know its name in German, Fliegenpilz. [F1,F2,F5] In Mainz-Bingen it is mostly reported in October, with smaller numbers appearing already in September and lingering into November. [F8] Sightings in this region are fairly rare overall, with only 19 reports gathered over ten years. [F8] ⚠️ 🟠
>
> It is poisonous and psychoactive, so it should only be admired, never eaten. [F4] ⚠️ 🟠 Various woodland creatures still feed on it, including the Waldmistkäfer and slugs such as the Great Grey Slug. [F6] ❌ 🟠 Squirrels are also known to nibble on it from time to time. [F6] ❌ 🟠 It can host other fungi, among them Hypomyces species and Chalciporus piperatus, which sometimes grow on or alongside it. [F7] ⚠️ 🟠
- s3 partial: 'fairly rare overall' is an added interpretation beyond the raw count
- s3 🟠 sightings are fairly rare overall
- s4 partial: the prescriptive advice 'should only be admired, never eaten' is not stated in the facts
- s4 🟠 it should only be admired, never eaten
- s5 unsupported: 'woodland creatures' is an added habitat/place claim not stated in the facts
- s5 🟠 it is eaten by various woodland creatures
- s6 unsupported: no squirrel species in F6 is Sciurus in general and 'from time to time' is an added behavioural claim; also contradicts by generalizing specific species
- s6 🟠 squirrels nibble on it occasionally
- s7 partial: 'grow on or alongside it' is an added descriptive claim beyond 'host of'
- s7 🟠 these fungi sometimes grow on or alongside it

### Feuersalamander · *Salamandra salamandra* · de (amphibian, 13 lines) · validator ✓ · 0.87 ¢ · judge usupsu · orphans 6
> Der Feuersalamander ist eine schwarz gefärbte Amphibie und erreicht eine Länge von etwa 28 cm bei einem Gewicht von rund 36 g. [F2,F7,F6] ❌ 🟠 Er lebt an Land, im Wasser und im Boden und ist tagsüber, in der Dämmerung und nachts unterwegs. [F8,F9] In Mainz-Bingen wird er vor allem von März bis Mai und von August bis Dezember gemeldet, mit einem deutlichen Höhepunkt im Oktober. [F12] ❌ 🟠
>
> Auf seinem Speiseplan stehen vor allem Gliederfüßer, darunter Schnegel wie der Tigerschnegel, Insekten wie der Kleine Frostspanner und verschiedene Schwebfliegenarten. [F5,F10] ⚠️ 🟠 Gefressen wird er unter anderem von der Barrenringelnatter, dem Eichelhäher und Wildschwein, aber auch von Enten wie Stockente und Löffelente. [F11] Die Art gilt als gefährdet und ist damit auf intakte, feuchte Lebensräume angewiesen, in denen sie Nahrung findet und sich vor Fressfeinden verbergen kann. [F4,F8] ❌ 🟠
- s1 unsupported: Schwarze Färbung ist nicht belegt (F2,F7,F6 nennen keine Farbe).
- s1 🟠 Ist schwarz gefärbt
- s3 unsupported: Ein Höhepunkt im Oktober ist nicht ausdrücklich als 'deutlicher Höhepunkt' belegt, obwohl Oktober 100% ist - das ist eine Interpretation, aber grenzwertig; jedoch 'Hauptzeit' entspricht F12.
- s3 🟠 Deutlicher Höhepunkt im Oktober
- s4 partial: 'vor allem' ist eine Gewichtung, die nicht belegt ist; Schwebfliegenarten sind mehrfach genannt aber als Gruppe nicht ausdrücklich hervorgehoben.
- s4 🟠 Nahrung sind vor allem Gliederfüßer
- s6 unsupported: Die Abhängigkeit von intakten feuchten Lebensräumen sowie die Funktion als Nahrungssuche- und Versteckort sind nicht belegt, das ist eine Interpretation.
- s6 🟠 Ist auf intakte feuchte Lebensräume angewiesen · Findet dort Nahrung · Kann sich vor Fressfeinden verbergen

### Feuersalamander · *Salamandra salamandra* · en (amphibian, 13 lines) · validator ✓ · 0.72 ¢ · judge upsssp · orphans 6
> The fire salamander is a black amphibian marked with bright yellow patterning, reaching about 28 cm in length and around 36 g in weight. [F7,F6] ❌ 🟠 In Mainz-Bingen it is reported through much of the year, with sightings rising from March, peaking around October, and continuing into the darker months of the year. [F12] ⚠️ 🟠 It moves between land, water, and underground shelters, and can be encountered by day as well as at dusk, dawn, or night. [F8,F9]
>
> It feeds on arthropods, taking prey such as slugs, wood pigeons, and various insects including hoverflies, moths, and stink bugs. [F5,F10] In turn it falls victim to predators like the barred grass snake, the wild boar, the domestic cat, and several waterbirds such as the mallard and the common pochard. [F11] The species is currently classified as vulnerable, a reminder that even a familiar woodland amphibian needs continued protection. [F4] ⚠️ 🟠
- s1 unsupported: Colour/pattern description not stated in any line
- s1 🟠 It is a black amphibian · It has bright yellow patterning
- s2 partial: Peak month and general trend supported, but 'rising from March' and 'continuing into darker months' overstate the data
- s2 🟠 Sightings rise from March · Sightings continue into darker months
- s6 partial: 'familiar woodland amphian' and 'needs continued protection' go beyond the cited status line
- s6 🟠 It is a familiar woodland amphibian · It needs continued protection

### Große Brennnessel · *Urtica dioica* · de (plant, 14 lines) · validator ✓ · 0.95 ¢ · judge sppuusps · orphans 5
> Die Große Brennnessel ist eine ausdauernde Staude, die bis zu 3 m hoch werden kann. [F2,F5,F6] Von Mai bis Oktober zeigt sie ihre windbestäubten Blüten. [F7,F8] ⚠️ In Mainz-Bingen wird sie vor allem zwischen April und Juli gemeldet, mit einem deutlichen Höhepunkt im Mai und einem weiteren Anstieg im Juli. [F12] ⚠️ 🟠 Schon im März und noch bis in den Oktober hinein lässt sie sich am Wegesrand entdecken. [F12] ❌ 🟠
>
> Zahlreiche Insekten nutzen die Pflanze als Nahrung, darunter Raupen von Kleinem Fuchs und Tagpfauenauge sowie verschiedene Marienkäfer wie der Siebenpunkt- und der Zweipunkt-Marienkäfer. [F10] ❌ 🟠 Auch die Rötelmaus frisst an ihr. [F10] Als Wirtspflanze dient sie zudem Faltern wie dem Braunen Bären und dem Landkärtchen sowie zahlreichen Pilzen. [F11] ⚠️ 🟠 Der Bestand gilt insgesamt als nicht gefährdet. [F4]
- s2 partial: 'zeigt ihre Blüten' als Beschreibung geht leicht über reine Blütezeitangabe hinaus, aber im Kern gedeckt
- s3 partial: Behauptung eines 'weiteren Anstiegs im Juli' ist eine Interpretation, die über die reinen Prozentwerte hinausgeht (Juli liegt unter Mai und Juni)
- s3 🟠 zeigt einen weiteren Anstieg im Juli
- s4 unsupported: 'am Wegesrand' ist eine erfundene Ortsangabe, die keine Zeile stützt
- s4 🟠 lässt sich am Wegesrand entdecken
- s5 unsupported: F10 listet gefressen von, nicht speziell 'Raupen'; diese Artzuordnung als Raupe ist nicht belegt
- s5 🟠 Kleiner Fuchs frisst als Raupe · Tagpfauenauge frisst als Raupe
- s7 partial: 'zahlreichen Pilzen' ist eine Verallgemeinerung, da F11 nur einzelne Pilzarten als Wirt nennt
- s7 🟠 ist Wirtspflanze zahlreicher Pilze

### Große Brennnessel · *Urtica dioica* · en (plant, 14 lines) · validator ✓ · 0.85 ¢ · judge puppppp · orphans 7
> This tall, herbaceous plant can grow up to 3 m high and is a perennial, returning year after year. [F5,F6] ⚠️ 🟠 In Mainz-Bingen it flowers from May to October, with blossoms carried on the wind rather than by insects. [F7,F8] ❌ 🟠 Sightings in the region are recorded throughout spring and summer, peaking sharply in May and staying strong from April into July. [F12] ⚠️ 🟠
>
> Despite its sting, it is a food source for many creatures, including several lice species, and in turn it feeds a wide range of animals such as the Small tortoiseshell, the Peacock butterfly, Sevenspotted Lady Beetle, 2-spot Ladybird and the Bank vole. [F9,F10] ⚠️ 🟠 It also serves as a host plant for caterpillars of the Map, Garden tiger moth, Small tortoiseshell and Peacock, alongside numerous fungi that grow on it. [F11] ⚠️ 🟠 Reproduction happens through wind-carried pollen during its long flowering season, and as a perennial it persists at the same spot for many years. [F6,F7,F8] ⚠️ 🟠 Its conservation status is of least concern, meaning it remains common and widespread. [F4] ⚠️ 🟠
- s1 partial: ‘returning year after year’ goes beyond ‘perennial herb’ as an added explanation
- s1 🟠 returns year after year
- s2 unsupported: flowering time is not specific to Mainz-Bingen; ‘rather than by insects’ is an added claim not stated
- s2 🟠 not pollinated by insects
- s3 partial: ‘sharply’ and description as ‘spring and summer’ go beyond the raw month profile data
- s3 🟠 sightings recorded in spring and summer
- s4 partial: ‘Despite its sting’ implies causal contrast not stated; ‘several lice species’ is an interpretation of taxon names
- s4 🟠 it stings
- s5 partial: ‘caterpillars of’ is an added specification not stated for all listed species; ‘numerous fungi’ generalizes host list
- s5 🟠 caterpillars of these species feed on it
- s6 partial: ‘persists at the same spot for many years’ is an added interpretation of perennial habit
- s6 🟠 persists at same spot for many years
- s7 partial: ‘remains common and widespread’ is an added interpretation of LC status
- s7 🟠 is common and widespread

### Nosferatu-Spinne · *Zoropsis spinimana* · de (insect, 6 lines) · validator ✓ · 0.53 ¢ · judge ssus · orphans 1
> Die Nosferatu-Spinne ist eine Art der Spinnentiere aus der Ordnung Araneae. [F1,F2] In Mainz-Bingen wird sie vor allem zwischen August und November gemeldet, mit einem deutlichen Höhepunkt im September und noch starker Präsenz im Oktober und November. [F5] Insgesamt liegen aus dieser Region über tausend Meldungen aus zehn Jahren vor, sodass Spaziergänger die Art hier gute Chancen haben zu entdecken. [F5] ❌ 🟠
>
> Auf ihrem Speiseplan stehen andere Spinnen sowie Schmetterlinge. [F4]
- s3 unsupported: Die Aussage über Spaziergänger und Entdeckungschancen ist eine unbelegte Interpretation/Empfehlung.
- s3 🟠 Spaziergänger haben gute Chancen die Art zu entdecken

### Nosferatu-Spinne · *Zoropsis spinimana* · en (insect, 6 lines) · validator ✓ · 0.52 ¢ · judge spppu · orphans 6
> This spider, known in English as the Zoropsid spider and in German as Nosferatu-Spinne, belongs to the arachnids within the order Araneae. [F1,F2,F3] In Mainz-Bingen it has been reported over a thousand times in the last ten years, making it a species you can realistically encounter here. [F5] ⚠️ 🟠 Sightings are most common from August to November, with numbers climbing sharply in September, the peak month, before tapering off through autumn. [F5] ⚠️ 🟠
>
> It feeds on other spiders as well as moths and butterflies, hunting rather than building a web to trap prey. [F4] ⚠️ 🟠 Its steady autumn presence in Mainz-Bingen suggests this is when it is most active and easiest to notice around homes and gardens. [F5] ❌ 🟠
- s2 partial: 'realistically encounter' is an added interpretive claim not stated by the line
- s2 🟠 it is realistically encountered there
- s3 partial: 'climbing sharply' and 'tapering off' are added interpretive descriptions beyond the raw percentages
- s3 🟠 numbers climb sharply in September · numbers taper off through autumn
- s4 partial: hunting instead of web-building is not stated by the fact line
- s4 🟠 it hunts rather than building a web
- s5 unsupported: 'most active and easiest to notice around homes and gardens' is an added interpretive claim not in the data
- s5 🟠 it is most active in autumn · it is easiest to notice around homes and gardens

### Kranich · *Grus grus* · de (bird, 15 lines) · validator ✓ · 0.80 ¢ · judge pspspps · orphans 5
> Der Kranich ist ein großer Vogel mit rund 5,5 kg Gewicht und einer beeindruckenden Spannweite von 2,2 m. [F6,F10] ⚠️ 🟠 In Mainz-Bingen lässt er sich vor allem im Februar sowie von Oktober bis Dezember beobachten, wenn die Meldungen deutlich zunehmen. [F14] Man trifft ihn dort typischerweise in Feuchtgebieten an, wo er sich tagsüber aufhält. [F7,F8] ⚠️ 🟠
>
> Als Allesfresser erbeutet er unter anderem Grasfrösche, Erdkröten, Blindschleichen, Zauneidechsen und Feuersalamander, aber auch Vögel wie Bluthänfling und Rohrammer. [F5,F12] Selbst wird er gelegentlich von der Rabenkrähe gefressen. [F13] ⚠️ 🟠 Als Zugvogel legt er weite Strecken zurück und kann in freier Wildbahn bis zu 43 Jahre alt werden. [F11,F9] ⚠️ 🟠 Nach der Roten Liste der IUCN gilt der Kranich als nicht gefährdet. [F4]
- s1 partial: 'großer' und 'beeindruckend' sind nicht belegte Zusätze
- s1 🟠 Der Kranich ist ein großer Vogel · Spannweite ist beeindruckend
- s3 partial: 'typischerweise' ist eine unbelegte Verallgemeinerung
- s3 🟠 Er hält sich dort typischerweise auf
- s5 partial: 'gelegentlich' ist eine unbelegte Häufigkeitsangabe
- s5 🟠 Dies geschieht gelegentlich
- s6 partial: 'weite Strecken' ist unbelegte Ausschmückung
- s6 🟠 Er legt weite Strecken zurück

### Kranich · *Grus grus* · en (bird, 15 lines) · validator ✗ 194 words · 0.83 ¢ · judge ppsppsss · orphans 10
> The common crane, known in German as Kranich, is a large grey bird with a wingspan of about 2.2 m, easy to spot in flight or standing tall in open wetlands. [F2,F3,F10,F7] ⚠️ 🟠 It weighs around 5.5 kg and is active by day, often moving in groups. [F6,F8] ⚠️ 🟠 In Mainz-Bingen it is best looked for in February, when sightings peak, and again during a strong autumn passage from October through December, with fewer birds seen in January and March. [F14] This pattern fits its migratory habits, as birds pass through on their way to and from breeding or wintering grounds. [F11,F14] ⚠️ 🟠
>
> The Kranich is an omnivore, feeding on a wide range of small animals such as frogs, toads, newts, lizards and slow worms, alongside other food it finds in wetland habitats. [F5,F7,F12] ⚠️ 🟠 Among its recorded prey are Common frog, Pool frog, Natterjack toad, Common toad, Fire salamander, Smooth newt, Sand lizard and Common slow worm, as well as birds like Dunlin, Common linnet, Eurasian curlew and Common reed bunting. [F12] In turn it can fall prey to the Carrion crow. [F13] Individuals may live up to 43 years in the wild, and the species is currently assessed as being of least concern. [F9,F4]
- s1 partial: colour grey and behaviour descriptors not stated
- s1 🟠 It is grey · It is large · Easy to spot in flight · Stands tall in open wetlands
- s2 partial: grouping behaviour not stated
- s2 🟠 Often moves in groups
- s4 partial: cause of pattern (migration to breeding/wintering grounds) not stated in facts
- s4 🟠 Pattern fits migratory habits · Birds pass through to breeding grounds · Birds pass through to wintering grounds
- s5 partial: preference for small animals as characterization goes beyond list; 'wide range' and 'other food' not stated
- s5 🟠 Feeds on wide range of small animals · Feeds on other food in wetland habitats

### Hirschkäfer · *Lucanus cervus* · de (insect, 8 lines) · validator ✓ · 0.77 ¢ · judge ppspps · orphans 4
> Der Hirschkäfer (Lucanus cervus) ist ein auffälliges Insekt aus der Ordnung der Käfer. [F1,F2] ⚠️ 🟠 In Mainz-Bingen wurde die Art vor allem im Juni und Juli beobachtet, mit einem deutlichen Höhepunkt im Juni und etwas geringerer Häufigkeit im Mai und Juli. [F7] ⚠️ 🟠 Außerhalb dieser Monate, etwa von Januar bis April sowie ab September, gibt es in der Region kaum Meldungen. [F7]
>
> Die Larven entwickeln sich im Holz verschiedener Laubbäume und ernähren sich unter anderem von Rotbuche, Stieleiche, Gemeiner Hasel und mehreren Prunus-Arten wie Vogelkirsche oder Schlehdorn. [F5] ⚠️ 🟠 Ausgewachsene Hirschkäfer stehen selbst auf dem Speiseplan anderer Tiere, etwa des Turmfalken oder anderer Vögel. [F6] ⚠️ 🟠 Nach der Roten Liste der IUCN gilt die Art derzeit als nicht gefährdet. [F4]
- s1 partial: 'auffällig' ist eine nicht belegte Wertung.
- s1 🟠 Ist auffällig
- s2 partial: Fakt nennt Mai nicht als Nebenmonat mit geringerer Häufigkeit gleich Juli, aber Mai-Wert (19) ist deutlich niedriger als Juli (51); Aussage über 'etwas geringerer Häufigkeit im Mai und Juli' vereinfacht/verzerrt die tatsächlichen unterschiedlichen Werte.
- s2 🟠 Geringere Häufigkeit im Mai und Juli
- s4 partial: Entwicklung im Holz und Fressen durch Larven ist nicht durch F5 belegt, F5 beschreibt nur allgemeines Fressen der Art.
- s4 🟠 Larven entwickeln sich im Holz von Laubbäumen
- s5 partial: 'Ausgewachsene' ist eine nicht belegte Präzisierung, F6 spricht allgemein von der Art.
- s5 🟠 Nur ausgewachsene Tiere werden gefressen

### Hirschkäfer · *Lucanus cervus* · en (insect, 8 lines) · validator ✓ · 0.58 ¢ · judge ssupp · orphans 4
> The Stag Beetle, known in German as Hirschkäfer, is an insect in the beetle order Coleoptera. [F1,F2,F3] In Mainz-Bingen it is seen mainly from June to July, with June the clear peak and a smaller share of sightings already in May and lingering into August and October. [F7]
>
> Its larvae feed on wood and roots of trees such as Beech, Pedunculate Oak, European ash, Hazel, and various cherry species like Sweet Cherry and Blackthorn. [F5] ❌ 🟠 Adults and larvae in turn serve as prey for birds such as the Common kestrel and other Aves. [F6] ⚠️ 🟠 The species is currently classified as Least Concern, suggesting stable populations overall. [F4] ⚠️ 🟠
- s3 unsupported: F5 states adult diet (eats), not larval feeding on wood and roots; that specific claim is not in F5.
- s3 🟠 larvae feed on wood and roots
- s4 partial: F6 does not distinguish adults vs larvae as prey; that split is added.
- s4 🟠 adults are prey for birds · larvae are prey for birds
- s5 partial: "suggesting stable populations" is an inference not stated by F4.
- s5 🟠 populations are stable overall

### Grasfrosch · *Rana temporaria* · de (amphibian, 15 lines) · validator ✓ · 0.93 ¢ · judge sppusss · orphans 4
> Der Grasfrosch erreicht eine Länge von etwa 11 cm und ein Gewicht von rund 48 g. [F6,F7] Er lebt an Land, im Wasser und gelegentlich auf Bäumen und ist sowohl tagsüber als auch nachts aktiv. [F8,F9] ⚠️ 🟠 In Mainz-Bingen wird er vor allem von Februar bis April gemeldet, mit einem deutlichen Höhepunkt im März und einem zweiten, schwächeren Anstieg im Oktober. [F13] ⚠️ 🟠
>
> Auf seinem Speiseplan stehen Gliederfüßer, darunter Köcherfliegen, Schmetterlingsmücken, Schmeißfliegen und Würmer wie Regenwürmer, außerdem gelegentlich auch Schnecken wie die Garten-Bänderschnecke. [F5,F10] ❌ 🟠 Zu seinen Fressfeinden zählen unter anderem Rotfuchs, Saatkrähe, Kranich, Weißstorch, Star, Fasan, Kuckuck, Rabenkrähe und Turmfalke, außerdem der Kleine Wasserfrosch. [F11] Als Wirt dient er zudem Fadenwürmern. [F12] Nach der IUCN gilt der Grasfrosch derzeit als nicht gefährdet. [F4]
- s2 partial: 'gelegentlich' bei Bäumen ist nicht belegt
- s2 🟠 lebt gelegentlich auf Bäumen
- s3 partial: Oktober-Anstieg als 'zweiter Höhepunkt' interpretiert, nicht explizit als Meldezeit-Höhepunkt genannt
- s3 🟠 zweiter schwächerer Anstieg im Oktober
- s4 unsupported: Bellardia-Arten als 'Schmetterlingsmücken' falsch benannt, Limoniidae fehlt in Aufzählung, Nahrung wird als 'gelegentlich' qualifiziert ohne Beleg
- s4 🟠 frisst Schmetterlingsmücken · frisst gelegentlich Schnecken

### Grasfrosch · *Rana temporaria* · en (amphibian, 15 lines) · validator ✗ 3 paragraphs, expected 2; p2: no sentences · 0.76 ¢ · judge psspusss · orphans 2
> The Common frog, known in German as Grasfrosch, is a smooth-skinned amphibian growing to about 11 cm and weighing around 48 g. [F2,F3,F7,F6] ⚠️ 🟠 It belongs to the frogs and toads (order Anura) within the amphibian group. [F1] It can be found both on land, in water and even climbing into trees, and is active by day as well as at night. [F8,F9] In Mainz-Bingen it is reported most often from February to April, with sightings peaking sharply in March. [F13] ⚠️ 🟠
>
> 
>
> It feeds on arthropods, and recorded prey includes snails, caddisflies, blowflies, craneflies and earthworms. [F5,F10] ❌ It in turn serves as food for many predators, among them the red fox, white stork, rook, common kestrel and common cuckoo. [F11] It can also be host to parasitic roundworms. [F12] Its conservation status is currently listed as least concern. [F4]
- s1 partial: 'smooth-skinned' is not stated in any line
- s1 🟠 it is smooth-skinned
- s4 partial: 'peaking sharply' is an added emphasis beyond the profile data
- s4 🟠 peak is sharp
- s5 unsupported: 'snails' and 'caddisflies' are genus-level claims not matching cited species precisely, but main issue: 'blowflies' matches Calliphoridae fine, however no line states general snails as prey category beyond specific species; also craneflies and earthworms are fine but overall sentence generalizes species names into common categories not stated

### Schwarz-Erle · *Alnus glutinosa* · de (plant, 12 lines) · validator ✓ · 0.88 ¢ · judge sspsss · orphans 1
> Die Schwarz-Erle ist ein Baum oder Strauch, der bis zu 25 m hoch werden kann. [F5,F6] Im April erscheinen die windbestäubten Blüten. [F7,F8] In Mainz-Bingen wurde die Art über das ganze Jahr gemeldet, mit Beobachtungsspitzen im Dezember, aber auch im Januar und August lassen sich die Bäume gut entdecken. [F11] ⚠️ 🟠
>
> Zahlreiche Tiere nutzen die Schwarz-Erle als Nahrung, darunter Moschusbock, Echter Widderbock, Brauner Bär, Bluthänfling, Kleiber, Heckenbraunelle, Star, Pappelschwärmer sowie Grüne Stinkwanze und Graue Gartenwanze. [F9] Auch als Wirt spielt der Baum eine Rolle, etwa für Pilze wie Schmetterlings-Tramete, Rotrandiger Baumschwamm und Gemeiner Schwefelporling sowie für Falter wie Schneespanner, Lindenschwärmer und Buchen-Streckfuß. [F10] Die Schwarz-Erle gilt laut Roter Liste als nicht gefährdet. [F4]
- s3 partial: Formulierung 'lassen sich Bäume gut entdecken' interpretiert die Daten als Beobachtbarkeit, nicht nur als Meldehäufigkeit.
- s3 🟠 Bäume lassen sich im Januar und August gut entdecken

### Schwarz-Erle · *Alnus glutinosa* · en (plant, 12 lines) · validator ✓ · 0.78 ¢ · judge supssus · orphans 4
> The Black Alder is a tree or shrub that can grow up to 25 m tall, known in German as Schwarz-Erle. [F2,F5,F6] It flowers in April, with pollen carried by the wind rather than insects. [F7,F8] ❌ 🟠 In Mainz-Bingen it has been reported throughout the year, with sightings peaking in December and also notably higher in January and August. [F11] ⚠️ 🟠
>
> This tree feeds a wide range of animals, including the Musk beetle, Wasp Beetle, Green shield bug, Eurasian nuthatch, Common linnet, Dunnock and Common starling. [F9] It also hosts many other organisms living on or in it, such as the Pale Brindled Beauty, Variegated Golden Tortrix, Lime Hawk-Moth, Coronet, Pale Tussock and fungi like Chicken Of The Woods and Candlesnuff Fungus. [F10] Its flowers form in April and rely on wind for pollination rather than a single dedicated partner. [F7,F8] ❌ 🟠 The species is currently assessed as of least concern. [F4]
- s2 unsupported: adds 'rather than insects', not stated
- s2 🟠 not pollinated by insects
- s3 partial: 'notably higher' interprets raw percentages beyond data
- s3 🟠 notably higher in January · notably higher in August
- s6 unsupported: 'rather than a single dedicated partner' not stated
- s6 🟠 no single dedicated pollination partner

### Dunkle Erdhummel · *Bombus terrestris* · de (insect, 9 lines) · validator ✓ · 0.83 ¢ · judge ppus · orphans 3
> Die Dunkle Erdhummel ist ein Insekt aus der Ordnung der Hautflügler und in Mainz-Bingen von Februar bis September regelmäßig zu beobachten, mit einem deutlichen Schwerpunkt im Juni und Juli. [F1,F7] ⚠️ Bereits ab Februar steigen die Meldungen stark an, im März und April ist sie schon häufig unterwegs, während es im Winter kaum Nachweise gibt. [F7] ⚠️ 🟠
>
> Auf ihren Streifzügen besucht sie Blüten von Robinie, Rosskastanie, Flieder, Beinwell, Nelkenwurz, Glockenblume und vielen weiteren Pflanzen, und sie nimmt Nektar und Pollen unter anderem von Borretsch, Möhre, Rotem Fingerhut und Kulturapfel auf. [F6,F4] ❌ 🟠 Zu ihren Fressfeinden zählen Spinnen wie die Gartenkreuzspinne und die Veränderliche Krabbenspinne, außerdem Hornissen und der Bienenfresser. [F5]
- s1 partial: Schwerpunkt Juni und Juli geht über reine Häufigkeitsdaten hinaus, ist aber durch die Monatswerte (99,100) noch gedeckt; jedoch 'regelmäßig zu beobachten' ist eine Interpretation, die als noch abgedeckt gilt - jedoch Klasse Insecta fehlt als Zwischenschritt, insgesamt akzeptabel bis auf leichte Interpretation
- s2 partial: 'steigen stark an' und 'schon häufig unterwegs' sind interpretierende Zusätze, die über die reinen Prozentwerte hinausgehen
- s2 🟠 Ab Februar steigen die Meldungen stark an · Im März und April ist sie häufig unterwegs
- s3 unsupported: 'Nektar und Pollen aufnehmen' wird nicht belegt, F4 sagt nur 'frisst'
- s3 🟠 Sie nimmt Nektar und Pollen von Borretsch auf

### Dunkle Erdhummel · *Bombus terrestris* · en (insect, 9 lines) · validator ✓ · 0.79 ¢ · judge pppsp · orphans 8
> The Buff-tailed Bumblebee, known in German as Dunkle Erdhummel, is a stout, dark bumblebee in the insect order Hymenoptera. [F1,F2,F3] ⚠️ 🟠 In Mainz-Bingen it can be seen from February through September, with numbers building through spring and peaking sharply in June and July. [F7] ⚠️ 🟠 Sightings drop off again in autumn, becoming rare by October and virtually absent in winter. [F7] ⚠️ 🟠
>
> It feeds at the flowers of many garden and wayside plants, including Apple, Borage, Queen Anne's Lace, Foxglove, Garden cosmos, Phacelia, Common Ragwort and Spotted Dead-nettle, and also visits Black Locust, Black Medick, Horse-chestnut, Corn poppy, Common Lilac, Common Comfrey and Wood Avens among many others. [F4,F6] 🟠 Such a well-provisioned bee attracts its own predators, being taken by spiders like the Cross Orbweaver, Oak Spider and Goldenrod Crab Spider, as well as by the European hornet and the European bee-eater. [F5] ⚠️ 🟠
- s1 partial: 'stout, dark' is an added descriptive claim not stated in the facts
- s1 🟠 it is stout · it is dark
- s2 partial: 'building through spring' and 'peaking sharply' are interpretive claims beyond the raw percentages
- s2 🟠 numbers build through spring
- s3 partial: 'rare by October' and 'virtually absent in winter' go beyond the plain percentage data as characterizations
- s3 🟠 sightings drop off in autumn · rare by October
- s4 🟠 feeds at flowers of many plants
- s5 partial: 'well-provisioned' is an added causal/descriptive claim not stated in the facts
- s5 🟠 it attracts predators · it is well-provisioned

### Schachbrett · *Melanargia galathea* · de (insect, 9 lines) · validator ✓ · 0.90 ¢ · judge spuss · orphans 3
> Das Schachbrett ist ein Falter aus der Ordnung der Schmetterlinge (Lepidoptera). [F1,F2] In Mainz-Bingen zeigen sich die meisten Meldungen im Juni, mit deutlichem Ausklang im Juli, während die übrigen Monate kaum eine Rolle spielen. [F8] ⚠️ 🟠
>
> Die Raupen fressen an verschiedenen Wiesengräsern und Kräutern wie Wiesen-Lieschgras, Gewöhnlichem Knäuelgras, Wiesen-Platterbse oder Mittlerem Klee. [F4] ❌ 🟠 Als Falter besucht das Schachbrett Blüten von Disteln, Flockenblumen, Wicken, Oregano und Baldrian und bestäubt dabei unter anderem Weg-Distel, Vogel-Wicke, Skabiosen-Flockenblume und Wiesen-Flockenblume. [F6,F7] Zu seinen Fressfeinden zählen Vögel wie Rauchschwalbe, Star, Kleiber und Mönchsgrasmücke sowie die Gartenkreuzspinne. [F5]
- s2 partial: 'deutlicher Ausklang' und 'kaum eine Rolle' sind interpretierende Zusätze über die reinen Prozentwerte hinaus
- s2 🟠 Deutlicher Ausklang im Juli · Übrige Monate spielen kaum eine Rolle
- s3 unsupported: Raupenfraß wird nicht belegt; F4 nennt allgemein 'frisst' ohne Lebensstadium, und die Raupen fressen laut Fakten nicht an Kräutern wie Wiesen-Platterbse oder Klee als Gräser klassifiziert
- s3 🟠 Raupen fressen an Wiesengräsern und Kräutern

### Schachbrett · *Melanargia galathea* · en (insect, 9 lines) · validator ✓ · 0.74 ¢ · judge upps · orphans 6
> The Marbled White (Schachbrett) is a butterfly with a checkered black-and-white wing pattern, belonging to the order Lepidoptera. [F1,F2,F3] ❌ 🟠 In Mainz-Bingen it is on the wing mainly from June to July, with sightings peaking sharply in June and still fairly common in July, while spring and late summer records are almost absent. [F8] ⚠️ 🟠
>
> As a caterpillar it feeds on grasses and herbs such as Cock's-Foot and Timothy, while the adult butterfly visits and pollinates flowers like Greater Knapweed, Oregano, zigzag clover, Tufted Vetch and various thistles. [F4,F6,F7] ⚠️ 🟠 It in turn serves as prey for birds such as the Barn Swallow, Common Starling, Eurasian Nuthatch and Dunnock, as well as for spiders like the Cross Orbweaver. [F5]
- s1 unsupported: Checkered black-and-white wing pattern is not stated in any line
- s1 🟠 It has a checkered black-and-white wing pattern
- s2 partial: Adds interpretive claim of 'sharp peak' and 'almost absent' for spring/late summer beyond raw percentages
- s2 🟠 Sightings peak sharply in June · Spring and late summer records are almost absent
- s3 partial: Caterpillar diet of grasses/herbs and 'feeds' as caterpillar not distinguished from adult diet in F4; F4 does not specify life stage
- s3 🟠 As a caterpillar it feeds on grasses and herbs · Adult butterfly visits flowers of Tufted Vetch · Adult butterfly visits flowers of thistles

### Europäische Gottesanbeterin · *Mantis religiosa* · de (insect, 8 lines) · validator ✓ · 0.79 ¢ · judge ssspps · orphans 2
> Die Europäische Gottesanbeterin ist ein Insekt aus der Ordnung der Fangschrecken (Mantodea). [F1,F2] In Mainz-Bingen wird sie vor allem im August und September gemeldet, mit dem Höhepunkt der Beobachtungen im September. [F7] Vereinzelte Meldungen gibt es schon im Juli, während Funde außerhalb dieser Monate deutlich seltener sind. [F7]
>
> Sie erbeutet vor allem andere Insekten wie Grashüpfer, Heuschrecken und Wespen, darunter den Weißrandigen Grashüpfer, das Grüne Heupferd, die Haus-Feldwespe und die Deutsche Wespe. [F5] ⚠️ 🟠 Umgekehrt zählen Vögel wie Weißstorch, Turmfalke, Elster, Eichelhäher und Haussperling sowie gelegentlich auch größere Insekten zu ihren Fressfeinden. [F6] ⚠️ 🟠 Nach der IUCN gilt die Art als nicht gefährdet. [F4]
- s4 partial: 'vor allem' und Kategorisierung als 'andere Insekten' sind nicht belegt, Deutsche Wespe/Haus-Feldwespe sind Wespen, keine Grashüpfer/Heuschrecken-Zuordnung nötig, aber 'vor allem' übertreibt.
- s4 🟠 Sie erbeutet vor allem andere Insekten
- s5 partial: 'gelegentlich größere Insekten' ist nicht belegt; F6 listet Grünes Heupferd und Deutsche Wespe als Fressfeinde ohne Häufigkeitsangabe.
- s5 🟠 Größere Insekten gehören gelegentlich zu ihren Fressfeinden

### Europäische Gottesanbeterin · *Mantis religiosa* · en (insect, 8 lines) · validator ✓ · 0.63 ¢ · judge psusp · orphans 4
> The European mantis is an insect known for its upright, prayer-like posture and slender green or brown body. [F1,F2,F3] ⚠️ 🟠 In Mainz-Bingen, sightings are recorded through most of the year but rise sharply from July, peak in September, and taper off by November. [F7]
>
> It hunts other insects, feeding on various grasshoppers such as the Lesser Marsh Grasshopper and Common field grasshopper, as well as wasps like the European paper wasp and German wasp. [F5] ❌ 🟠 In turn, it becomes prey for birds including the White stork, Common kestrel, Eurasian jay, House sparrow, and Eurasian magpie. [F6] According to the IUCN Red List, the species is classified as least concern, meaning it currently faces no major threat. [F4] ⚠️ 🟠
- s1 partial: Colour/body description not stated in cited lines
- s1 🟠 It has upright, prayer-like posture · It has slender green or brown body
- s3 unsupported: 'Hunts' and 'feeding on' imply behaviour beyond eats-relationship; also adds Great Green Bush-cricket omission is fine, but wasp count includes only two of many, still fine as subset; however 'hunts other insects' generalizes beyond record
- s3 🟠 It hunts other insects
- s5 partial: Added causal claim about facing no major threat not stated
- s5 🟠 It currently faces no major threat

### Tagpfauenauge · *Aglais io* · de (insect, 10 lines) · validator ✓ · 1.00 ¢ · judge pupuss · orphans 6
> Das Tagpfauenauge ist ein Schmetterling (Insekt) mit den charakteristischen großen, augenartigen Flecken auf den Flügeln, die ihm seinen Namen geben. [F1,F2] ⚠️ 🟠 In Mainz-Bingen ist es vor allem im März und Juli am häufigsten unterwegs, mit weiteren Aktivitätsphasen im April, Juni und September. [F8] ❌ Von November bis Januar ist es dort kaum zu beobachten. [F8] ⚠️
>
> Die Raupen fressen an Pflanzen wie Scharbockskraut, Echter Nelkenwurz, Weg-Distel, Vogel-Wicke und vielen weiteren Arten. [F4] ❌ 🟠 Erwachsene Falter besuchen zur Nahrungsaufnahme Blüten von Kratzdistel, Duftveilchen, Flieder, Beinwell und weiteren Pflanzen und bestäuben dabei unter anderem Baldrian, Teufelsabbiss, Skabiosen-Flockenblume, Holunder und Klee. [F7,F6] Als Nahrung dient das Tagpfauenauge wiederum verschiedenen heimischen Vögeln wie Rauchschwalbe, Star, Kleiber, Mönchsgrasmücke und Haussperling. [F5]
- s1 partial: Augenartige Flecken und Namensgebung nicht belegt
- s1 🟠 Hat große augenartige Flecken auf Flügeln · Flecken geben ihm den Namen
- s2 unsupported: Juli ist stärkster Monat (100%), nicht gleichrangig mit März; Juni/September als 'weitere Aktivitätsphasen' verzerrt Rangfolge
- s3 partial: Januar-Wert ist 2%, nicht 0%, 'kaum zu beobachten' für Januar ungenau formuliert im Vergleich zu November (0%)
- s4 unsupported: F4 bezieht sich auf 'frisst' allgemein, nicht spezifisch auf Raupen; Scharbockskraut nicht in F4 genannt (dort Ranunculus ficaria, botanisch identisch, aber unter anderem Namen)
- s4 🟠 Raupen fressen an Scharbockskraut · Raupen fressen an Echter Nelkenwurz · Raupen fressen an Weg-Distel · Raupen fressen an Vogel-Wicke

### Tagpfauenauge · *Aglais io* · en (insect, 10 lines) · validator ✓ · 0.81 ¢ · judge sspsp · orphans 10
> Known in German as the Tagpfauenauge, this butterfly belongs to the insect order Lepidoptera. [F1,F2] In Mainz-Bingen it is seen mainly in March and April, again from June to July, and once more in September, with July being the busiest month of all. [F8]
>
> As a caterpillar it feeds on plants such as Wood Avens, Tufted Vetch, and English Ivy, while adults visit flowers like Lesser Celandine, Sweet Violet, Common Comfrey, Bull Thistle and Common Lilac for nectar. [F4,F7] ⚠️ 🟠 While feeding it also helps pollinate flowers including Valerian, Devil's-Bit Scabious, Greater Knapweed, Small Scabious, Oxeye Daisy and Elder. [F6] It in turn serves as food for many birds around the region, among them Barn swallow, Common starling, House sparrow, Eurasian nuthatch and Dunnock. [F5] ⚠️ 🟠
- s3 partial: Feeding on plants as caterpillar is not stated; F4 is generic 'eats' without life stage.
- s3 🟠 caterpillar feeds on Wood Avens · caterpillar feeds on Tufted Vetch · caterpillar feeds on English Ivy · adults visit flowers of Lesser Celandine · adults visit flowers of Sweet Violet · adults visit flowers of Common Comfrey · adults visit flowers of Bull Thistle · adults visit flowers of Common Lilac · visits flowers for nectar
- s5 partial: 'Around the region' is an added claim not stated in F5.
- s5 🟠 eaten by many birds around the region

### Admiral · *Vanessa atalanta* · de (insect, 11 lines) · validator ✓ · 1.13 ¢ · judge upsusss · orphans 5
> Der Admiral ist ein Falter aus der Ordnung der Schmetterlinge (Lepidoptera), der sich mit seiner dunklen, orangerot gebänderten Flügelzeichnung gut erkennen lässt. [F1,F2] ❌ 🟠 In Mainz-Bingen wird die Art das ganze Jahr über gemeldet, mit einem ersten Anstieg im Februar und März und dem stärksten Auftreten von Juni bis September, besonders im Juli und August. [F9] ⚠️ 🟠 Auch im Oktober und November lassen sich noch Tiere beobachten, bevor die Zahlen im Winter deutlich zurückgehen. [F9]
>
> Als Raupe frisst der Admiral unter anderem an Gewöhnlicher Kratzdistel, Weg-Distel, Gemeinem Efeu, Gemeinem Flieder und Kulturapfel. [F5] ❌ 🟠 Erwachsene Falter besuchen zahlreiche Blüten wie Kratzdistel, Flieder, Vogel-Wicke, Kulturapfel, Waldgeißblatt, Scharbockskraut, Kornelkirsche und Oregano und bestäuben dabei etwa Kulturapfel, Vogelkirsche, Gänseblümchen und Magerwiesen-Margerite. [F8,F7] Gefressen wird der Admiral wiederum von Vögeln wie Rauchschwalbe, Star, Kleiber, Heckenbraunelle und Mönchsgrasmücke sowie von der Gartenkreuzspinne. [F6] Nach der Roten Liste der IUCN gilt die Art als nicht gefährdet. [F4]
- s1 unsupported: Flügelzeichnung (Farbe/Muster) wird durch keine Zeile belegt.
- s1 🟠 hat dunkle Flügelzeichnung · hat orangerot gebänderte Flügelzeichnung
- s2 partial: Ganzjährige Meldung, erster Anstieg Feb/Mär und Betonung Juli/August gehen über reine Monatswerte hinaus bzw. Jan-Wert ist minimal (nicht 'ganzjährig' meldbar als durchgehend relevant).
- s2 🟠 Art wird das ganze Jahr über gemeldet · besonders im Juli und August
- s4 unsupported: Es wird nicht belegt, dass der Admiral als Raupe frisst; F5 nennt nur 'frisst' allgemein.
- s4 🟠 Admiral frisst als Raupe

### Admiral · *Vanessa atalanta* · en (insect, 11 lines) · validator ✓ · 0.86 ¢ · judge pppuusp · orphans 12
> The Red Admiral, called Admiral in German, is a butterfly belonging to the insects (Lepidoptera). [F1,F2,F3] ⚠️ In Mainz-Bingen it can be seen from February through October, with numbers rising sharply in June and peaking in July before tapering off into autumn. [F9] ⚠️ 🟠 Sightings are much scarcer in the cooler months of January, November and December. [F9] ⚠️
>
> As a caterpillar it feeds on plants such as thistles, ivy, alfalfa and speedwell, while adults visit the flowers of lilac, apple, oregano, dogwood, honeysuckle and many more for nectar. [F5,F8] ❌ 🟠 While feeding it also pollinates flowers like daisy, oxeye daisy, apple, sweet cherry and spindletree. [F7] ❌ 🟠 It in turn serves as food for birds such as the barn swallow, common starling, dunnock and Eurasian blackcap, and is sometimes caught by the cross orbweaver spider. [F6] The species is currently assessed as of least concern, meaning it faces no particular threat. [F4] ⚠️ 🟠
- s1 partial: Lepidoptera is an order (moths and butterflies), not equivalent to 'the insects'; class is Insecta separately, order Lepidoptera, not stated as synonymous with insects generally
- s2 partial: F9 shows main time as Feb–Apr and Jun–Oct, not a continuous Feb–Oct span, and no rise described as 'sharp'
- s2 🟠 Seen in Mainz-Bingen from February through October
- s3 partial: 'cooler months' is an added causal/seasonal framing not stated in F9
- s4 unsupported: F5 and F8 do not distinguish caterpillar diet from adult nectar visits; feeding list is attributed to 'eats' generally, not specifically caterpillars, and flower visiting is not stated as adults only
- s4 🟠 As a caterpillar it feeds on thistles · As a caterpillar it feeds on ivy · As a caterpillar it feeds on alfalfa · As a caterpillar it feeds on speedwell · Adults visit flowers of lilac · Adults visit flowers of apple · Adults visit flowers of oregano · Adults visit flowers of dogwood · Adults visit flowers of honeysuckle
- s5 unsupported: Sentence claims pollination happens 'while feeding' (on nectar visits), a causal link not stated in F7
- s5 🟠 Pollination occurs while feeding
- s7 partial: 'faces no particular threat' is an added interpretive claim beyond the LC status label
- s7 🟠 It faces no particular threat

### Westliche Honigbiene · *Apis mellifera* · de (insect, 11 lines) · validator ✓ · 1.01 ¢ · judge spssss · orphans 1
> Die Westliche Honigbiene gehört zu den Insekten aus der Ordnung der Hautflügler und ist in Mainz-Bingen von Februar bis Oktober unterwegs, mit einem deutlichen Schwerpunkt in den Sommermonaten Juni und August sowie einem weiteren Höhepunkt im Juli. [F1,F2,F8] Schon im Februar und März zeigt sich reges Fliegen, im Winter dagegen sind Beobachtungen selten. [F8] ⚠️ 🟠
>
> Beim Nektar- und Pollensammeln besucht sie eine große Bandbreite an Blüten, etwa von Beinwell, Storchschnabel, Nieswurz, Diptam, Wolfsmilch-Arten und Glockenblumen. [F7] Auch als Nahrungspflanzen genutzt werden unter anderem Robinie, Kratzdistel, Rosskastanie, Flieder, Hain-Salbei und Kulturapfel. [F5] Zu ihren Fressfeinden zählen Bienenwolf, Gartenkreuzspinne, Mönchsgrasmücke, Deutsche Wespe und Hornisse. [F6] Nach der IUCN gilt die Datenlage zum Bestand als ungenügend, ein gesicherter Gefährdungsstatus liegt somit nicht vor. [F4]
- s2 partial: 'reges Fliegen' im Feb/März und 'selten im Winter' sind interpretierende Zusätze über die reinen Prozentwerte hinaus, wobei Jan/Dez mit 4% tatsächlich niedrig sind, aber 'regen' Zustand ist wertend.
- s2 🟠 Beobachtungen im Winter sind selten

### Westliche Honigbiene · *Apis mellifera* · en (insect, 11 lines) · validator ✓ · 0.88 ¢ · judge upsuuss · orphans 8
> The Western honey bee (Apis mellifera) is a small, fuzzy insect of the order Hymenoptera, easily recognised as it moves busily from bloom to bloom. [F1,F3] ❌ 🟠 In Mainz-Bingen it can be seen from February right through to October, with numbers climbing sharply in spring and peaking during June and August. [F8] ⚠️ 🟠 Sightings taper off again through September and October, becoming rare by November and December. [F8]
>
> It feeds on nectar and pollen from a huge range of plants, including Black Locust, Bull Thistle, Black Medick, Common Comfrey, Common Lilac and Apple, and it likewise visits the flowers of Common Comfrey, Cypress Spurge, Clustered Bellflower and many others for forage. [F5,F7] ❌ 🟠 This constant flower-visiting makes it an important pollination partner for these plants. [F7] ❌ 🟠 It in turn serves as prey for a variety of predators, among them the European beewolf, the Cross Orbweaver, the Eurasian blackcap, the European hornet and the German Wasp. [F6] Its conservation status is currently listed as data deficient, meaning too little is known to judge how the population is faring. [F4] 🟠
- s1 unsupported: ‘small, fuzzy’ and ‘busily moving from bloom to bloom’ are not stated
- s1 🟠 It is small · It is fuzzy · It moves busily from bloom to bloom
- s2 partial: ‘climbing sharply in spring’ and singling out June and August as peaks beyond data nuance is an added interpretation
- s2 🟠 Numbers climb sharply in spring
- s4 unsupported: ‘feeds on nectar and pollen’ is not stated, only that it eats these plants and visits flowers
- s4 🟠 It feeds on nectar from many plants · It feeds on pollen from many plants
- s5 unsupported: pollination role and importance are not stated by the fact, only flower visiting
- s5 🟠 It is an important pollination partner for these plants
- s7 🟠 Data deficient means too little is known to judge population trend

### Hauhechel-Bläuling · *Polyommatus icarus* · de (insect, 10 lines) · validator ✓ · 1.29 ¢ · judge spssus · orphans 2
> Der Hauhechel-Bläuling ist ein Schmetterling aus der Ordnung der Falter (Lepidoptera) und zählt damit zu den Insekten. [F1] In Mainz-Bingen fliegt er vor allem von Mai bis September, wobei die Zahl der Beobachtungen im Juli stark ansteigt und im September ihren Höhepunkt erreicht. [F8] ⚠️ 🟠 Bereits im April lassen sich erste Falter sehen, im Oktober klingt die Saison mit nur noch wenigen Meldungen aus. [F8]
>
> Als Raupe frisst er an Pflanzen wie Hopfenklee, Vogel-Wicke, Luzerne und Knollen-Platterbse. [F4] Als Falter besucht er Blüten von Wiesen-Platterbse, Zaun-Wicke, Rapunzel-Glockenblume und Wildem Kartendistel-Verwandten wie der Gewöhnlichen Kratzdistel und trägt dabei zur Bestäubung von Hundsrose, Wiesen-Schaumkraut und Ringelblume bei. [F7,F6] ❌ 🟠 Zu seinen Fressfeinden zählen Vögel wie Rauchschwalbe, Mönchsgrasmücke, Star und Haussperling. [F5]
- s2 partial: Anstieg im Juli und Höhepunkt im September sind Interpretation, nicht explizit als 'stark ansteigend' oder 'Höhepunkt' benannt über reine Zahlen hinaus - aber Zahlen stützen dies eigentlich, jedoch 'stark ansteigend' ist eine Zusatzdeutung
- s2 🟠 Beobachtungen steigen im Juli stark an
- s5 unsupported: 'Wildem Kartendistel-Verwandten' ist erfunden, Gewöhnliche Kratzdistel ist keine Verwandte der Wilden Karde in den Fakten benannt, zudem falsche Kategorisierung
- s5 🟠 Gewöhnliche Kratzdistel ist mit Wilder Karde verwandt

### Hauhechel-Bläuling · *Polyommatus icarus* · en (insect, 10 lines) · validator ✓ · 0.79 ¢ · judge puusp · orphans 4
> The Common blue, known in German as Hauhechel-Bläuling, is a small butterfly of the insect order Lepidoptera. [F1,F2,F3] ⚠️ 🟠 In Mainz-Bingen it is on the wing mainly from May to September, with numbers rising through June and peaking between July and September before tapering off in October. [F8] ❌
>
> Its caterpillars feed on plants such as Black Medick, Tufted Vetch and Bush Vetch, all common in local meadows. [F4,F7] ❌ 🟠 As an adult it visits flowers like Bull Thistle, Meadow vetchling, Cock's-Foot and Lesser Celandine for nectar, and in doing so helps pollinate species such as Lesser Celandine, Dog rose, Cuckoo Flower and Teasel. [F7,F6] It in turn serves as food for many birds of field and hedgerow, including Barn swallow, Dunnock, Common starling and House sparrow. [F5] ⚠️ 🟠
- s1 partial: ‘small’ is an added size attribute not stated in the facts.
- s1 🟠 It is a small butterfly
- s2 unsupported: Bush Vetch is not listed as a food plant for caterpillars, only as visited flower (adult); attributing feeding to caterpillars specifically is not stated; also detailed rise/peak/taper description goes beyond simple listing.
- s3 unsupported: Bush Vetch is listed under visited flowers (F7), not eaten (F4); caterpillar feeding is not distinguished from adult nectar feeding; 'common in local meadows' is unsupported.
- s3 🟠 Caterpillars feed on Bush Vetch · These plants are common in local meadows
- s5 partial: 'field and hedgerow' habitat descriptor for birds is not stated in facts.
- s5 🟠 These are birds of field and hedgerow

### Kleiner Kohlweißling · *Pieris rapae* · de (insect, 10 lines) · validator ✓ · 1.01 ¢ · judge sssppp · orphans 3
> Der Kleine Kohlweißling (Pieris rapae) ist ein Schmetterling aus der Ordnung der Lepidoptera. [F1,F2] In Mainz-Bingen lässt er sich vor allem von Juni bis September beobachten, mit einem deutlichen Höhepunkt im August und noch reger Flugzeit im Juli und September. [F7] Schon ab März und bis in den Oktober hinein tauchen einzelne Meldungen auf, während der Winter praktisch flugfrei bleibt. [F7]
>
> Die Raupen fressen an einer Vielzahl von Pflanzen wie Gewöhnlicher Kratzdistel, Efeu-Ehrenpreis, Behaartem Schaumkraut, Scharbockskraut und Wicken-Arten wie der Vogel-Wicke und der Zaun-Wicke. [F4] ⚠️ 🟠 Als erwachsener Falter besucht er Blüten von Duftveilchen, Waldgeißblatt, Wiesen-Platterbse, Zaun-Wicke, Echtem Baldrian, Gemeinem Efeu und Wiesen-Storchschnabel. [F6] ⚠️ 🟠 Zu seinen natürlichen Feinden zählen Vögel wie Rauchschwalbe, Star, Kleiber, Heckenbraunelle, Kuckuck und Rabenkrähe, außerdem die Gartenkreuzspinne. [F5] ⚠️ 🟠
- s4 partial: 'Raupen' fressen wird nicht belegt, Fressverhalten ist nur allgemein als 'frisst' angegeben.
- s4 🟠 Raupen fressen an Gewöhnlicher Kratzdistel
- s5 partial: 'Als erwachsener Falter' ist eine nicht belegte Ergänzung.
- s5 🟠 Ist als erwachsener Falter blütenbesuchend
- s6 partial: 'natürliche Feinde' ist eine Interpretation, die über 'wird gefressen von' hinausgeht.
- s6 🟠 Hat natürliche Feinde

### Kleiner Kohlweißling · *Pieris rapae* · en (insect, 10 lines) · validator ✓ · 0.75 ¢ · judge pspp · orphans 6
> This small butterfly, known in German as Kleiner Kohlweißling, belongs to the insect order Lepidoptera. [F1,F2] ⚠️ 🟠 In Mainz-Bingen it is reported mainly from June to September, with sightings rising sharply from April, peaking in August, and tapering off by autumn. [F7]
>
> As a caterpillar it feeds on a range of low-growing plants such as Hairy Bittercress, Lesser Celandine, Hedge Mustard and various vetches, while as an adult it visits flowers like Sweet Violet, Bush Vetch, Meadow Crane's-bill and English Ivy for nectar. [F4,F6] ⚠️ 🟠 It in turn serves as food for many garden and hedgerow animals, including Barn Swallows, Dunnocks, Common Starlings, Eurasian Nuthatches and spiders such as the Cross Orbweaver. [F5] ⚠️ 🟠
- s1 partial: size adjective 'small' not stated in cited lines
- s1 🟠 It is a small butterfly
- s3 partial: caterpillar/adult stage distinction not stated in facts; 'low-growing' descriptor unsupported
- s3 🟠 As a caterpillar it eats Hairy Bittercress · Food plants are low-growing · As an adult it visits Sweet Violet flowers · It visits flowers for nectar
- s4 partial: 'garden and hedgerow' habitat descriptor not stated
- s4 🟠 These animals include garden and hedgerow species

### Ackerhummel · *Bombus pascuorum* · de (insect, 10 lines) · validator ✓ · 0.93 ¢ · judge ssssus · orphans 0
> Die Ackerhummel (Bombus pascuorum) gehört zu den Insekten aus der Ordnung der Hautflügler. [F1,F2] In Mainz-Bingen lässt sie sich vor allem von April bis September beobachten, mit einem deutlichen Höhepunkt im August und ebenfalls starker Aktivität im Juni und Juli. [F8] Schon ab März und noch bis in den Oktober hinein sind vereinzelte Sichtungen möglich. [F8]
>
> Sie besucht Blüten vieler Pflanzen, etwa Storchschnabel, Gemeinen Flieder, Glockenblumen, Salbei, Gamander und Feldahorn, und ernährt sich unter anderem von Echtem Beinwell, Zaun-Wicke, Oregano, Weißer Taubnessel und verschiedenen Flockenblumen. [F7,F5] Als Beute dient sie unter anderem Gartenkreuzspinne, Eichblatt-Radspinne, Veränderlicher Krabbenspinne, Hornisse und dem Bienenfresser. [F6] ❌ Nach der IUCN-Einstufung gilt die Ackerhummel als nicht gefährdet. [F4]
- s5 unsupported: 'Beute' unterstellt Fressbeziehung, F6 belegt nur 'wird gefressen von'; zudem fehlende Fressbeziehungsangabe für Bienenfresser ist als Fressverhalten formuliert, was ok ist, aber Wortwahl 'Beute' impliziert Jagdverhalten, das keine Zeile belegt.

### Ackerhummel · *Bombus pascuorum* · en (insect, 10 lines) · validator ✓ · 0.91 ¢ · judge upusu · orphans 10
> The Common Carder Bee, known locally as Ackerhummel, is a fuzzy, ginger-brown bumblebee you can spot on walks through Mainz-Bingen from March through October. [F2,F3,F8] ❌ 🟠 Sightings climb steadily from March, peak in August, and taper off by October, so summer is the best time to look for it. [F8] ⚠️ 🟠
>
> It feeds on and pollinates a wide range of flowers, including comfrey, oregano, greater knapweed, white dead-nettle, harebell, and field maple, making it a busy visitor in gardens and hedgerows. [F5,F7] ❌ 🟠 It in turn falls prey to spiders such as the cross orbweaver and the goldenrod crab spider, as well as the European hornet and the European bee-eater. [F6] Currently listed as least concern, this species remains a common and welcome sight for anyone walking through the region's meadows and hedges. [F4] ❌ 🟠
- s1 unsupported: Colour/texture details not stated; no line says sightings occur in October (F8 shows 0% in Oct... actually Sep 47, Oct 18, not zero, but 'through October' okay only if within Apr-Sep main range; F8 says main time Apr-Sep, not March-October).
- s1 🟠 It is fuzzy · It is ginger-brown · It is a bumblebee · Main activity is March through October
- s2 partial: Adds interpretive claim 'best time to look' not stated; 'steadily' and 'taper off' are embellishments beyond raw percentages.
- s2 🟠 Summer is the best time to look for it
- s3 unsupported: Claims it pollinates (not stated, only 'eats' and 'visits flowers'); 'busy visitor in gardens and hedgerows' is an added habitat/behaviour claim not in facts.
- s3 🟠 It pollinates flowers · It is a busy visitor in gardens and hedgerows
- s5 unsupported: Adds unstated claims of being 'common' and 'welcome sight' and habitat preference for meadows and hedges.
- s5 🟠 It is a common sight · It is a welcome sight · It is seen in meadows and hedges

### Rapsweißling · *Pieris napi* · de (insect, 9 lines) · validator ✓ · 0.96 ¢ · judge ssspuss · orphans 5
> Der Rapsweißling ist ein Schmetterling aus der Ordnung der Schmetterlinge (Lepidoptera). [F1] Sein deutscher Name lautet Rapsweißling. [F2] In Mainz-Bingen lässt er sich vor allem von April bis September beobachten, mit Höhepunkten im April, Juni und besonders im Juli. [F7] Auch im Mai und August ist er noch recht häufig unterwegs, während er im Frühjahr (März) und Herbst (Oktober) nur vereinzelt auftaucht. [F7] ⚠️
>
> Die Raupen fressen an verschiedenen Wildkräutern wie Behaartem Schaumkraut, Wiesen-Platterbse, Vogel-Wicke, Scharbockskraut und Weg-Rauke. [F4] ❌ 🟠 Als Blütenbesucher nascht der Falter unter anderem an Gewöhnlicher Kratzdistel, Duftveilchen, Echtem Beinwell, Vogel-Wicke, Zaun-Wicke und Rundblättriger Glockenblume. [F6] Zu seinen Fressfeinden zählen Vögel wie Rauchschwalbe, Mönchsgrasmücke, Heckenbraunelle, Star und Kleiber sowie die Gartenkreuzspinne. [F5]
- s4 partial: 'noch recht häufig' und 'nur vereinzelt' sind interpretierende Zusätze über die reinen Prozentwerte hinaus
- s5 unsupported: F4 nennt Fraßpflanzen des Falters, nicht explizit der Raupen; Auswahl 'Wildkräuter' ist Zusatzinterpretation
- s5 🟠 Raupen fressen an Behaartem Schaumkraut · Raupen fressen an Wiesen-Platterbse · Raupen fressen an Vogel-Wicke · Raupen fressen an Scharbockskraut · Raupen fressen an Weg-Rauke

### Rapsweißling · *Pieris napi* · en (insect, 9 lines) · validator ✓ · 0.81 ¢ · judge sppuus · orphans 9
> The Green-veined white, known locally as Rapsweißling, is a butterfly of the order Lepidoptera. [F1,F2,F3] In Mainz-Bingen it is seen from March to October, with the busiest weeks running from April into September and a clear peak in July. [F7] ⚠️ Sightings rise sharply in April, stay strong through June, and taper off again by September and October. [F7] ⚠️
>
> Its caterpillars feed on plants such as Hairy Bittercress, Hedge Mustard, Tufted Vetch, Meadow vetchling, Lesser Celandine, Oregano and Valerian. [F4] ❌ 🟠 As an adult it visits flowers including Bull Thistle, Hedgerow Crane's-bill, Common Comfrey, Wood Avens, Sweet Violet, Harebell, Tufted Vetch and Bush Vetch for nectar. [F6] ❌ 🟠 It in turn serves as food for birds like the Barn swallow, Dunnock, Common starling, Eurasian nuthatch and Eurasian blackcap, as well as for the Cross Orbweaver spider. [F5]
- s2 partial: March and October have low/zero activity (18%, 12%), not accurately described as 'seen from' with busiest weeks framing; peak in July is supported but 'clear peak' overstates single-month dominance given August at 81%
- s3 partial: Sightings rise sharply in April but then drop in May (51%) before rising again in June/July, so 'stay strong through June' misrepresents the dip at May
- s4 unsupported: F4 lists these as general 'eats' relations, not specifically caterpillar feeding; no line specifies life stage
- s4 🟠 caterpillars feed on Hairy Bittercress · caterpillars feed on Hedge Mustard · caterpillars feed on Tufted Vetch · caterpillars feed on Meadow vetchling · caterpillars feed on Lesser Celandine · caterpillars feed on Oregano · caterpillars feed on Valerian
- s5 unsupported: F6 states it visits flowers of these plants, but does not specify it is the adult stage doing so, nor that it is for nectar
- s5 🟠 as an adult it visits flowers of Bull Thistle · visits are for nectar


## V1 · claude-sonnet-5

### Amsel · *Turdus merula* · de (bird, 16 lines) · validator ✓ · 0.83 ¢ · judge sppsp · orphans 2
> Die Amsel ist ein Vogel aus der Ordnung der Passeriformes, mit einer Spannweite von 36 cm und einem Gewicht um 103 g, und gilt als nicht gefährdet. [F1,F2,F10,F6,F4] In Mainz-Bingen liegen 6009 Meldungen aus zehn Jahren vor, ganzjährig, mit den meisten Beobachtungen im Januar und Dezember und weniger im Sommer, etwa im August. [F14] ⚠️ 🟠 Als Standvogel bleibt sie das ganze Jahr über in der Region und ist tagsüber aktiv, meist in Wald und am Boden. [F11,F8,F7] ⚠️ 🟠
>
> Als Allesfresser wurde sie unter anderem beim Fressen von Rotbuche, Klatschmohn, Echtem Beinwell und Echter Nelkenwurz beobachtet. [F5,F13] Der Nachwuchs ist mit 365 Tagen ausgewachsen, und Amseln können in freier Wildbahn bis zu 21,8 Jahre alt werden. [F12,F9] ⚠️
- s2 partial: 'weniger im Sommer' und Hervorhebung August ist Interpretation über bloße Zahlen hinaus
- s2 🟠 weniger Beobachtungen im Sommer
- s3 partial: 'meist' in Wald und Boden ist eine unbelegte Häufigkeitsangabe
- s3 🟠 meist in Wald und am Boden
- s5 partial: 'ausgewachsen' interpretiert 'reif' anders als im Fact

### Amsel · *Turdus merula* · en (bird, 16 lines) · validator ✓ · 0.68 ¢ · judge sssss · orphans 0
> The Common blackbird is a bird of the order Passeriformes, with a status of least concern, weighing around 103 g with a wingspan of about 36 cm. [F1,F3,F4,F6,F10] In Mainz-Bingen it has been reported year-round, with 6009 records over ten years and sightings staying frequent through the colder months while dropping to their lowest around August. [F14]
>
> It is active by day, lives in forest and on the ground, feeds as an omnivore, and does not migrate, staying resident year-round. [F8,F7,F5,F11] It has been recorded eating Black Locust, Beech, Corn poppy and Wood Avens, among many other plants. [F13] Offspring reach maturity at about 365 days, and individuals can live up to 21.8 years in the wild. [F12,F9]

### Kleiner Feuerfalter · *Lycaena phlaeas* · de (insect, 11 lines) · validator ✓ · 0.91 ¢ · judge sss · orphans 0
> Der Kleine Feuerfalter ist ein Insekt aus der Ordnung der Schmetterlinge, das in Mainz-Bingen vor allem von April bis Mai und von Juli bis Oktober gemeldet wird. [F1,F2,F8]
>
> Er wurde beim Fressen an Vogelknöterich, Vogel-Wicke, Zypressen-Wolfsmilch und Wiesen-Sauerampfer beobachtet und besucht unter anderem die Blüten von Gewöhnlicher Kratzdistel, Vogel-Wicke, Scharbockskraut und Ranunculus ficaria. [F4,F7] Bei der Bestäubung wurde er an Ranunculus ficaria, Gemeinem Efeu, Ringelblume und Möhre erfasst, und Vögel wie Rauchschwalbe, Kernbeißer, Star und Haussperling wurden beim Fressen von ihm beobachtet. [F6,F5]

### Kleiner Feuerfalter · *Lycaena phlaeas* · en (insect, 11 lines) · validator ✓ · 0.83 ¢ · judge ssss · orphans 0
> In Mainz-Bingen, this insect has been reported 126 times over ten years, mainly from April to May and again from July to October, with reports peaking in September. [F8] It belongs to the butterflies and moths, and carries the German name Kleiner Feuerfalter alongside its English name Small Copper. [F1,F2,F3]
>
> It has been recorded eating Prostrate knotweed, Common Milkwort, Tufted Vetch and Sorrel, and has been seen visiting the flowers of Bull Thistle, Wood Avens, Hedge Mustard and Lesser Celandine. [F4,F7] It has also been observed pollinating Ranunculus ficaria, English Ivy, Queen Anne's Lace and Dog rose, and has been recorded as prey of Barn swallow, Common starling, House sparrow and Common cuckoo. [F6,F5]

### Fliegenpilz · *Amanita muscaria* · de (fungus, 10 lines) · validator ✗ 3 paragraphs, expected 2; p2: no sentences · 0.71 ¢ · judge sspss · orphans 1
> Der Fliegenpilz ist ein Pilz aus der Ordnung Agaricales und gilt als giftig und psychoaktiv. [F1,F2,F4] Sein Sporenpulver ist weiß. [F5] In Mainz-Bingen liegen aus zehn Jahren 19 Meldungen vor, mit der Hauptzeit Oktober bis November und einem deutlichen Schwerpunkt im Oktober. [F8] ⚠️ 🟠
>
> 
>
> Der Fliegenpilz wurde als Wirt von Cladosporium epimyces, Hypomyces, Chalciporus piperatus und Hypomyces hyalinus beobachtet. [F7] Als Nahrung wurde er unter anderem bei Waldmistkäfer, Tigerschnegel und Sciurus niger festgestellt. [F6]
- s3 partial: Deutlicher Schwerpunkt im Oktober ist eine über die reinen Zahlen hinausgehende Interpretation.
- s3 🟠 Es gibt einen deutlichen Schwerpunkt im Oktober

### Fliegenpilz · *Amanita muscaria* · en (fungus, 10 lines) · validator ✓ · 0.60 ¢ · judge spus · orphans 2
> Fly Agaric is a fungus, and in Mainz-Bingen most reports of it come in October, with fewer in November and September. [F1,F8] It is poisonous and psychoactive, so it is one to admire on a walk rather than pick. [F4] ⚠️ 🟠
>
> It produces a white spore print, and it has been recorded being eaten by the Waldmistkäfer, the Great Grey Slug, and squirrels such as Sciurus niger and Sciurus lis. [F5,F6] ❌ 🟠 It has also been recorded as host to fungi including Cladosporium epimyces, Hypomyces hyalinus, and Chalciporus piperatus. [F7]
- s2 partial: The advice to admire rather than pick is not stated in any line.
- s2 🟠 It should be admired rather than picked
- s3 unsupported: Sciurus lis and Sciurus niger are called squirrels, an added classification not in the fact line, and Chalciporus piperatus is miscategorised elsewhere but here squirrel label goes beyond record; also 'such as' implies a general habit.
- s3 🟠 Sciurus niger and Sciurus lis are squirrels

### Feuersalamander · *Salamandra salamandra* · de (amphibian, 13 lines) · validator ✓ · 0.78 ¢ · judge ssss · orphans 0
> Der Feuersalamander ist eine Amphibie, die als gefährdet eingestuft ist und in Mainz-Bingen vor allem von März bis Mai sowie von August bis Dezember gemeldet wird, mit den meisten Meldungen im Oktober. [F1,F2,F4,F12] Er wird etwa 28 cm lang und rund 36 g schwer und ist an Land, im Wasser und im Boden anzutreffen, tagsüber, in der Dämmerung und nachts. [F6,F7,F8,F9]
>
> Er ernährt sich von Gliederfüßern und wurde beim Fressen von Tigerschnegel, Kleinem Frostspanner, Gemeinem Rückenschwimmer und Mistbiene beobachtet. [F5,F10] Er wurde selbst als Beute von Stockente, Eichelhäher, Wildschwein und Barrenringelnatter registriert. [F11]

### Feuersalamander · *Salamandra salamandra* · en (amphibian, 13 lines) · validator ✓ · 0.69 ¢ · judge sssus · orphans 0
> This is an amphibian, listed as vulnerable, weighing around 36 g and reaching about 28 cm in length. [F1,F4,F6,F7] In Mainz-Bingen, reports come mostly from March to May and August to December, with most sightings around October. [F12]
>
> It lives on land, in water and underground, and can be active by day, at dusk and dawn, or at night. [F8,F9] Its diet consists of arthropods, and it has been recorded eating Ash-black Slug, Winter moth, Drone Fly and Brown marmorated stink bug, among others. [F5,F10] ❌ It has in turn been recorded as prey of the Barred grass snake, Domestic Cat, Wild boar and Eurasian jay. [F11]
- s4 unsupported: Slug species eaten is Great Grey Slug in F10 example list, not Ash-black Slug uniquely— actually both are listed, but 'Ash-black Slug' is present; however diet 'arthropods' contradicts eating slugs (molluscs) which is a mismatch beyond citation.

### Große Brennnessel · *Urtica dioica* · de (plant, 14 lines) · validator ✓ · 1.17 ¢ · judge sssusp · orphans 7
> Die Große Brennnessel ist eine Staude, die bis zu 3 m hoch werden kann und deren Bestand als nicht gefährdet gilt. [F5,F6,F4] In Mainz-Bingen liegen die meisten Meldungen zwischen April und Juli, mit einem Höhepunkt im Mai. [F12] Sie blüht von Mai bis Oktober und wird dabei vom Wind bestäubt. [F7,F8]
>
> Verschiedene Lausfliegen-Arten wie Colpocephalum indi, Splendoroffula tauracobia oder Eomenopon ryani wurden beim Fressen an ihr beobachtet. [F9] ❌ 🟠 Umgekehrt dient die Pflanze unter anderem Siebenpunkt-Marienkäfer, Kleinem Fuchs, Zweipunkt-Marienkäfer und Tagpfauenauge als Nahrung. [F10] Als Wirtspflanze wurde sie außerdem für Raupen von Braunem Bär, Landkärtchen, Kleinem Fuchs und Tagpfauenauge sowie für verschiedene Pilzarten dokumentiert. [F11] ⚠️ 🟠
- s4 unsupported: F9 nennt Kieferläuse/Federlinge, nicht 'Lausfliegen'; die Arten werden gefressen, nicht als fressend beobachtet.
- s4 🟠 Colpocephalum indi ist eine Lausfliegen-Art · Splendoroffula tauracobia ist eine Lausfliegen-Art · Eomenopon ryani ist eine Lausfliegen-Art
- s6 partial: F11 spricht nicht spezifisch von Raupen, sondern allgemein von Wirt-Beziehungen.
- s6 🟠 Ist Wirtspflanze für Raupen von Braunem Bär · Ist Wirtspflanze für Raupen von Landkärtchen · Ist Wirtspflanze für Raupen von Kleinem Fuchs · Ist Wirtspflanze für Raupen von Tagpfauenauge

### Große Brennnessel · *Urtica dioica* · en (plant, 14 lines) · validator ✗ p2: no sentences · 0.55 ¢ · judge ss · orphans 0
> This is a perennial herb, growing up to 3 m tall, listed as least concern, with most reports in Mainz-Bingen coming in Apr–Jul. [F6,F5,F4,F12] It flowers from May to October and is pollinated by wind. [F7,F8]
>
> 

### Nosferatu-Spinne · *Zoropsis spinimana* · de (insect, 6 lines) · validator ✓ · 0.48 ¢ · judge spu · orphans 1
> Die Nosferatu-Spinne (Zoropsis spinimana) gehört zu den Spinnentieren und wurde in Mainz-Bingen in zehn Jahren 1077 Mal gemeldet. [F1,F2,F5] Die meisten Meldungen fallen in die Zeit von August bis November, mit dem stärksten Monat im September. [F5] ⚠️
>
> Sie wurde beim Fressen von Araneae und Lepidoptera beobachtet. [F4] ❌ 🟠
- s2 partial: Hauptzeit ist Aug–Nov, nicht 'die meisten Meldungen'; September als stärkster Monat ist korrekt, aber Formulierung übertreibt Anteil.
- s3 unsupported: GloBI gibt Fressbeziehung an, keine Beobachtung.
- s3 🟠 wurde beim Fressen beobachtet

### Nosferatu-Spinne · *Zoropsis spinimana* · en (insect, 6 lines) · validator ✓ · 0.42 ¢ · judge sss · orphans 0
> The Zoropsid spider, known in German as Nosferatu-Spinne, is a spider of the order Araneae. [F1,F2,F3] In Mainz-Bingen it has been reported 1077 times over ten years, with most reports falling between August and November. [F5]
>
> It has been recorded eating other spiders (Araneae) and moths or butterflies (Lepidoptera). [F4]

### Kranich · *Grus grus* · de (bird, 15 lines) · validator ✓ · 0.74 ¢ · judge sssss · orphans 0
> Der Kranich gehört zu den Vögeln, hat eine Spannweite von 2,2 m, wiegt rund 5,5 kg und gilt als nicht gefährdet. [F1,F2,F10,F6,F4] In Mainz-Bingen liegen die meisten Meldungen im Februar sowie zwischen Oktober und Dezember, mit dem stärksten Aufkommen im Februar. [F14]
>
> Er ist tagsüber aktiv, lebt als Allesfresser in Feuchtgebieten und zieht als Zugvogel. [F8,F5,F7,F11] Beobachtet wurde er beim Fressen von Grasfrosch, Erdkröte, Blindschleiche und Zauneidechse, während er selbst schon von der Rabenkrähe gefressen wurde. [F12,F13] Frei lebende Tiere können bis zu 43 Jahre alt werden. [F9]

### Kranich · *Grus grus* · en (bird, 15 lines) · validator ✓ · 0.61 ¢ · judge spsss · orphans 1
> The Common crane is a bird with a wingspan of 2.2 m and a mass of about 5.5 kg, listed as least concern. [F3,F10,F6,F4] In Mainz-Bingen most reports come in February and again from October to December, so walkers are most likely to see it in those months. [F14] ⚠️ 🟠
>
> It is active by day, lives in wetland habitat, is migratory, and has an omnivorous diet. [F8,F7,F11,F5] It has been recorded eating Common frog, Dunlin, Common linnet and Eurasian curlew, among many other partners, and has itself been eaten by Carrion crow. [F12,F13] In the wild it can live up to 43 years. [F9]
- s2 partial: The recommendation that walkers are most likely to see it is an added interpretation not stated in the data.
- s2 🟠 Walkers most likely to see it then

### Hirschkäfer · *Lucanus cervus* · de (insect, 8 lines) · validator ✗ 3 paragraphs, expected 2; p2: no sentences · 0.62 ¢ · judge ssss · orphans 0
> Der Hirschkäfer ist ein Insekt aus der Ordnung der Käfer und gilt als nicht gefährdet. [F1,F2,F4] In Mainz-Bingen wurden in zehn Jahren 63 Meldungen erfasst, mit den meisten Beobachtungen im Juni und Juli. [F7]
>
> 
>
> Er wurde beim Fressen von Rotbuche, Vogelkirsche, Gemeiner Esche und Stieleiche beobachtet. [F5] Umgekehrt wurde er als Beute von Turmfalke, Bubulcus ibis und Carabus sibiricus registriert. [F6]

### Hirschkäfer · *Lucanus cervus* · en (insect, 8 lines) · validator ✓ · 0.48 ¢ · judge sss · orphans 0
> The Stag Beetle is an insect of the beetle order, listed as least concern, and in Mainz-Bingen most reports come in June and July. [F1,F3,F4,F7]
>
> It has been recorded eating Beech, Sweet Cherry, European ash and Pedunculate Oak, among many other plants. [F5] It has in turn been recorded as prey of the Common kestrel and of Aves. [F6]

### Grasfrosch · *Rana temporaria* · de (amphibian, 15 lines) · validator ✓ · 0.87 ¢ · judge spsss · orphans 1
> Der Grasfrosch ist eine Amphibie aus der Ordnung der Froschlurche, die von der IUCN als nicht gefährdet eingestuft wird und etwa 11 cm lang sowie rund 48 g schwer wird. [F1,F2,F4,F6,F7] In Mainz-Bingen liegen die meisten Meldungen zwischen Februar und April, mit einem deutlichen Höhepunkt im März. [F13] ⚠️ 🟠 Anzutreffen ist er an Land, im Wasser und auf Bäumen, tagsüber wie nachts. [F8,F9]
>
> Als Nahrung dienen ihm Gliederfüßer, und beobachtet wurde er beim Fressen von Garten-Bänderschnecken, Köcherfliegen (Trichoptera), Schmeißfliegen (Calliphoridae) und Regenwürmern (Lumbricidae). [F5,F10] Er dient wiederum als Beute für Tiere wie Rotfuchs, Weißstorch, Turmfalke und Star, und Nematoda wurden als Parasiten an ihm nachgewiesen. [F11,F12]
- s2 partial: 'Höhepunkt im März' entspricht 100% im Monatsprofil, aber 'deutlicher Höhepunkt' ist eine wertende Zuspitzung über die reinen Prozentzahlen hinaus
- s2 🟠 deutlicher Höhepunkt im März

### Grasfrosch · *Rana temporaria* · en (amphibian, 15 lines) · validator ✓ · 0.69 ¢ · judge sssss · orphans 0
> The Common frog is an amphibian, an animal you may come across on land, in water or even in trees, measuring around 11 cm and weighing about 48 g. [F1,F8,F7,F6] It is listed as least concern, and in Mainz-Bingen most reports come from February to April, with reports peaking in March. [F4,F13]
>
> Its diet consists of arthropods, and it has been recorded eating Trichoptera, Limoniidae, earthworms (Lumbricidae) and White-lipped snails. [F5,F10] It has been recorded being eaten by Red fox, Rook, White stork and Common kestrel, among many others, and it can carry Nematoda as a parasite. [F11,F12] It is active both by day and at night. [F9]

### Schwarz-Erle · *Alnus glutinosa* · de (plant, 12 lines) · validator ✗ 3 paragraphs, expected 2; p2: no sentences · 0.75 ¢ · judge spss · orphans 1
> Die Schwarz-Erle ist ein Baum oder Strauch, der bis zu 25 m hoch werden kann und gilt als nicht gefährdet. [F2,F5,F6,F4] In Mainz-Bingen liegen aus zehn Jahren 27 Meldungen vor, mit Nachweisen über das ganze Jahr und einem Schwerpunkt im Dezember. [F11] ⚠️ 🟠
>
> 
>
> Sie blüht im April und wird durch den Wind bestäubt. [F7,F8] Beobachtet wurde sie beim Gefressenwerden unter anderem durch Moschusbock, Halsbandsittich, Saatkrähe und Bluthänfling, und sie diente als Wirt etwa für den Schneespanner, den Lindenschwärmer und die Schmetterlings-Tramete. [F9,F10]
- s2 partial: Ein 'Schwerpunkt im Dezember' geht über die reine Monatsprofil-Angabe hinaus und ist keine explizit genannte Kernaussage der Zeile.
- s2 🟠 Es gibt einen Schwerpunkt im Dezember

### Schwarz-Erle · *Alnus glutinosa* · en (plant, 12 lines) · validator ✓ · 0.62 ¢ · judge ssss · orphans 0
> Black Alder is a tree or shrub growing up to 25 m, classed as least concern, and in Mainz-Bingen it has been reported throughout the year with most records in December. [F5,F6,F4,F11] It flowers in April, with pollination carried out by the wind. [F7,F8]
>
> It has been recorded as food for the Musk beetle, Rook, Common starling and Eurasian nuthatch, among many other reported partners. [F9] It also hosts species such as the Lime Hawk-Moth, Pale Tussock, Turkeytail and Chicken Of The Woods. [F10]

### Dunkle Erdhummel · *Bombus terrestris* · de (insect, 9 lines) · validator ✓ · 0.80 ¢ · judge ssus · orphans 4
> Die Dunkle Erdhummel ist ein Insekt aus der Ordnung der Hautflügler, das in Mainz-Bingen mit 728 Meldungen in zehn Jahren erfasst wurde. [F1,F2,F7] Die Hauptzeit liegt zwischen Februar und September, mit den stärksten Werten im Juni und Juli. [F7]
>
> Sie wurde beim Fressen von Kulturapfel, Borretsch, Möhre und Rotem Fingerhut beobachtet und besucht Blüten von Gewöhnlicher Robinie, Klatschmohn, Gemeinem Flieder und Echtem Beinwell. [F4,F6] ❌ 🟠 Als Beute wurde sie unter anderem bei Gartenkreuzspinne, Hornisse, Bienenfresser und Asiatischer Hornisse verzeichnet. [F5]
- s3 unsupported: 'Fressen' ist nicht belegt, F4 belegt nur 'frisst' als generelle Beziehung, nicht 'beobachtet beim Fressen'
- s3 🟠 beim Fressen von Kulturapfel beobachtet · beim Fressen von Borretsch beobachtet · beim Fressen von Möhre beobachtet · beim Fressen von Rotem Fingerhut beobachtet

### Dunkle Erdhummel · *Bombus terrestris* · en (insect, 9 lines) · validator ✗ 3 paragraphs, expected 2; p2: no sentences · 0.69 ¢ · judge ppss · orphans 3
> The Buff-tailed Bumblebee is an insect from the group of bees and wasps, reported 728 times over ten years in Mainz-Bingen. [F1,F3,F7] ⚠️ 🟠 Walkers meet it mainly between February and September, with reports rising sharply from March and peaking in June and July. [F7] ⚠️ 🟠
>
> 
>
> It has been recorded feeding at Apple, Borage, Queen Anne's Lace and Phacelia, and visiting the flowers of Black Locust, Horse-chestnut, Common Lilac and Corn poppy, among many others. [F4,F6] It has in turn been recorded being eaten by the Cross Orbweaver, the European hornet, the Goldenrod Crab Spider and the European bee-eater. [F5]
- s1 partial: order Hymenoptera is not 'bees and wasps' generically stated; F1 only gives order Hymenoptera, class Insecta, not a 'group of bees and wasps' label; region/count fine
- s1 🟠 It is from the group of bees and wasps
- s2 partial: 'Walkers meet it' and 'rising sharply from March' are added framing/interpretation beyond the data
- s2 🟠 Reports rise sharply from March · Walkers meet it

### Schachbrett · *Melanargia galathea* · de (insect, 9 lines) · validator ✗ 3 paragraphs, expected 2; p2: no sentences · 0.91 ¢ · judge sssss · orphans 0
> Das Schachbrett ist ein Insekt aus der Ordnung der Schmetterlinge und in Mainz-Bingen mit 644 Meldungen in zehn Jahren belegt. [F1,F2,F8] Die meisten Beobachtungen fallen auf Juni und Juli, mit dem stärksten Aufkommen im Juni. [F8]
>
> 
>
> Es wurde beim Besuch von Blüten der Strahlenlosen Kamille, Rundblättrigen Glockenblume, Wiesen-Platterbse und des Oregano beobachtet und bestäubt unter anderem Wiesen-Flockenblume, Vogel-Wicke und Mittleren Klee. [F7,F6] Als Nahrungspflanzen wurden außerdem Wiesen-Lieschgras, Gewöhnliches Knäuelgras und Weiße Fetthenne festgestellt. [F4] Gefressen wurde es unter anderem von Rauchschwalbe, Star, Kleiber und Gartenkreuzspinne. [F5]

### Schachbrett · *Melanargia galathea* · en (insect, 9 lines) · validator ✓ · 0.71 ¢ · judge sss · orphans 0
> The Marbled White is an insect, part of the butterfly order Lepidoptera, and in Mainz-Bingen most reports come in June and July. [F1,F3,F8]
>
> It has been recorded eating plants such as Common Hemp-Nettle, Harebell, Timothy and Meadow vetchling, and visiting flowers of Bull Thistle, Tufted Vetch, Oregano and Valerian, while also pollinating Greater Knapweed, Brown Knapweed and Sweet Cherry. [F4,F7,F6] It has in turn been recorded being eaten by birds such as the Barn swallow, Rook, Common starling and Eurasian nuthatch, as well as by the Cross Orbweaver. [F5]

### Europäische Gottesanbeterin · *Mantis religiosa* · de (insect, 8 lines) · validator ✓ · 0.71 ¢ · judge ssss · orphans 0
> Die Europäische Gottesanbeterin ist ein Insekt aus der Ordnung der Fangschrecken und gilt als nicht gefährdet. [F1,F2,F4] In Mainz-Bingen liegen aus zehn Jahren 630 Meldungen vor, mit den meisten Beobachtungen im August und September. [F7]
>
> Beobachtet wurde sie beim Fressen von Grashüpfern wie dem Weißrandigen Grashüpfer und dem Braunen Grashüpfer sowie von Wespen wie der Haus-Feldwespe und der Deutschen Wespe. [F5] Umgekehrt wurde sie selbst von Vögeln wie Saatkrähe, Weißstorch, Fasan und Turmfalke erbeutet. [F6]

### Europäische Gottesanbeterin · *Mantis religiosa* · en (insect, 8 lines) · validator ✓ · 0.57 ¢ · judge sss · orphans 0
> The European mantis is an insect with a status of least concern, and in Mainz-Bingen most reports come in Aug–Sep. [F1,F3,F4,F7]
>
> It has been recorded eating grasshoppers such as the Lesser Marsh Grasshopper, Common field grasshopper and Great Green Bush-cricket, as well as wasps like the European paper wasp and German Wasp. [F5] It has in turn been recorded as prey of birds including the Rook, White stork, Common pheasant and Common kestrel. [F6]

### Tagpfauenauge · *Aglais io* · de (insect, 10 lines) · validator ✓ · 0.87 ¢ · judge pss · orphans 1
> Das Tagpfauenauge ist ein Insekt aus der Ordnung der Schmetterlinge und begegnet Spaziergängern in Mainz-Bingen vor allem im März und April, im Juni und Juli sowie im September. [F1,F2,F8] ⚠️ 🟠
>
> Es wurde beim Fressen an Ranunculus ficaria, Echter Nelkenwurz, Weg-Distel und Vogel-Wicke beobachtet und besucht Blüten von Strahlenloser Kamille, Gemeinem Flieder, Duftveilchen und Weg-Rauke. [F4,F7] Beim Bestäuben wurde es unter anderem an Duftveilchen, Echtem Baldrian, Schwarzem Holunder und Skabiosen-Flockenblume registriert, während es selbst von Rauchschwalbe, Star, Mönchsgrasmücke und Haussperling gefressen wird. [F6,F5]
- s1 partial: 'Spaziergängern begegnet' ist keine belegte Aussage, F8 nennt nur Meldungen
- s1 🟠 Es begegnet Spaziergängern

### Tagpfauenauge · *Aglais io* · en (insect, 10 lines) · validator ✓ · 0.74 ¢ · judge sss · orphans 0
> The Peacock is an insect of the butterfly order, and in Mainz-Bingen it has been reported most often from March to April, in June and July, and again in September. [F1,F3,F8]
>
> It has been recorded visiting flowers such as Bull Thistle, Common Lilac, Sweet Violet and Apple, and pollinating Valerian, Devil's-Bit Scabious, Greater Knapweed and Elder. [F7,F6] It has been observed eating plants including Wood Avens, Tufted Vetch, Oregano and Meadow Crane's-bill, and has itself been recorded eaten by the Barn swallow, Common starling, House sparrow and Eurasian blackcap. [F4,F5]

### Admiral · *Vanessa atalanta* · de (insect, 11 lines) · validator ✓ · 0.96 ¢ · judge suuss · orphans 1
> Der Admiral ist ein Schmetterling aus der Ordnung der Lepidoptera und gilt nach der Roten Liste der IUCN als nicht gefährdet. [F1,F2,F4] In Mainz-Bingen liegen die meisten Meldungen zwischen Februar und April sowie zwischen Juni und Oktober, mit den stärksten Werten im Juli und August. [F9] ❌
>
> Die Raupen wurden unter anderem an Gewöhnlicher Kratzdistel, Gemeinem Flieder, Kulturapfel und Gemeinem Efeu beim Fressen beobachtet. [F5] ❌ 🟠 Als Blütenbesucher wurde der Admiral an Gewöhnlicher Kratzdistel, Kulturapfel, Gänseblümchen und Oregano registriert und bestäubt dabei unter anderem Kulturapfel, Vogelkirsche und Gänseblümchen. [F8,F7] Er wurde seinerseits von Tieren wie Rauchschwalbe, Star, Mönchsgrasmücke und Gartenkreuzspinne gefressen. [F6]
- s2 unsupported: Stärkste Werte sind Juli und August, aber Text nennt nur diese als 'stärkste', während Profil auch weitere Details enthält; zudem sind Meldungszeiträume korrekt aber die Behauptung 'stärksten Werte im Juli und August' ist eine Interpretation, die zusätzlich August als zweitstärksten hervorhebt ohne expliziten Vergleich in der Quelle - dies geht über reine Wiedergabe hinaus, da Juli=100 und Aug=98 sehr nah sind, aber technisch stimmt es überein. Da Hauptzeit korrekt zitiert und Extremwerte korrekt aus F9 ablesbar sind, ist dies eigentlich supported.
- s3 unsupported: F5 listet Fraßpflanzen des Admirals generell, nicht spezifisch Raupen beim Fressen beobachtet.
- s3 🟠 Raupen wurden beim Fressen beobachtet

### Admiral · *Vanessa atalanta* · en (insect, 11 lines) · validator ✓ · 0.93 ¢ · judge ssss · orphans 0
> The Red Admiral, an insect of the order Lepidoptera, is listed as least concern. [F1,F3,F4] In Mainz-Bingen it has been reported 594 times over ten years, mainly from February to April and again from June to October, with the most reports around July. [F9]
>
> It has been recorded eating Black Locust, Bull Thistle, Common Lilac and Apple, and pollinating plants such as Apple, Sweet Cherry, Oxeye Daisy and Daisy. [F5,F7] It has been seen visiting the flowers of Bull Thistle, Common Lilac, Apple and Oregano, and it has been recorded being eaten by Barn swallow, Rook, Common starling and Cross Orbweaver. [F8,F6]

### Westliche Honigbiene · *Apis mellifera* · de (insect, 11 lines) · validator ✓ · 0.89 ¢ · judge ssss · orphans 0
> Die Westliche Honigbiene gehört zu den Insekten und wird in Mainz-Bingen mit 593 Meldungen in zehn Jahren vor allem von Februar bis Oktober beobachtet, mit den meisten Nachweisen im Juni und August. [F1,F2,F8] Der Bestand gilt laut Roter Liste als ungenügend erfasst, um einen Status zuzuweisen. [F4]
>
> Sie wurde beim Fressen von Gewöhnlicher Robinie, Gewöhnlicher Kratzdistel, Hopfenklee und Gewöhnlicher Rosskastanie beobachtet und besucht unter anderem die Blüten von Echtem Beinwell, Diptam, Stinkender Nieswurz und Großem Ehrenpreis. [F5,F7] Sie wurde ihrerseits als Beute von Bienenwolf, Gartenkreuzspinne, Deutscher Wespe und Hornisse festgestellt. [F6]

### Westliche Honigbiene · *Apis mellifera* · en (insect, 11 lines) · validator ✓ · 0.72 ¢ · judge ssss · orphans 0
> The Western honey bee is an insect in the order Hymenoptera, and in Mainz-Bingen reports of it run from February through October, with the busiest months from June to August. [F1,F3,F8] Its conservation status is listed as data deficient. [F4]
>
> It has been recorded visiting flowers of Common Comfrey, Cretan bryony, Cypress Spurge and Clustered Bellflower, and observed feeding on Black Locust, Bull Thistle, Common Lilac and Apple among many other plants. [F7,F5] It has in turn been recorded as prey of the European beewolf, the Cross Orbweaver, the European hornet and the German Wasp. [F6]

### Hauhechel-Bläuling · *Polyommatus icarus* · de (insect, 10 lines) · validator ✓ · 0.91 ¢ · judge ssps · orphans 0
> Der Hauhechel-Bläuling ist ein Insekt aus der Ordnung der Schmetterlinge (Lepidoptera). [F1,F2] In Mainz-Bingen liegen aus zehn Jahren 580 Meldungen vor, mit den meisten Beobachtungen von Mai bis September und einem Schwerpunkt im Juli, August und September. [F8]
>
> Als Raupe wurde er beim Fressen an Hopfenklee, Vogel-Wicke, Luzerne und Saat-Esparsette beobachtet, als Falter besucht er unter anderem Blüten von Gewöhnlicher Kratzdistel, Rapunzel-Glockenblume und Hain-Salbei und wurde beim Bestäuben von Ringelblume, Borretsch und Hundsrose registriert. [F4,F7,F6] ⚠️ Er wurde außerdem als Beute von Vögeln wie Rauchschwalbe, Star, Haussperling und Mönchsgrasmücke erfasst. [F5]
- s3 partial: Lebensstadien (Raupe/Falter) werden den Fressen-/Bestäuben-Fakten hinzugefügt, die das nicht spezifizieren.

### Hauhechel-Bläuling · *Polyommatus icarus* · en (insect, 10 lines) · validator ✓ · 0.80 ¢ · judge spsss · orphans 1
> The Common blue, an insect in the order Lepidoptera, is known here as the Hauhechel-Bläuling and has been reported 580 times over ten years in Mainz-Bingen. [F1,F2,F3,F8] Reports run from May to September, with numbers rising through the summer and peaking in September. [F8] ⚠️ 🟠
>
> It has been recorded feeding on plants such as Black Medick, Tufted Vetch, Sainfoin and Alfalfa, and visiting the flowers of Bull Thistle, rampion bellflower, Cock's-Foot and Burnet rose among many others. [F4,F7] It has also been seen pollinating flowers including Dog rose, Common Plantain, Cuckoo Flower and Teasel. [F6] It has been recorded as prey of birds such as the Barn swallow, Dunnock, House sparrow and Common starling. [F5]
- s2 partial: peak month is September but Aug is 98% near-equal, and 'rising through summer' overstates the plain monthly profile; main time stated as May-Sep matches, peak claim goes beyond simple citation of profile.
- s2 🟠 numbers rise through the summer

### Kleiner Kohlweißling · *Pieris rapae* · de (insect, 10 lines) · validator ✓ · 0.82 ¢ · judge sss · orphans 0
> Der Kleine Kohlweißling (Pieris rapae) ist ein Insekt aus der Ordnung der Schmetterlinge, das in Mainz-Bingen von Juni bis September am häufigsten gemeldet wird, mit einem Höhepunkt im August. [F1,F2,F7]
>
> Er wurde beim Fressen an Pflanzen wie Gewöhnlicher Kratzdistel, Behaartem Schaumkraut, Vogel-Wicke und Scharbockskraut beobachtet, und er besucht Blüten von Duftveilchen, Zaun-Wicke, Echtem Baldrian und Gemeinem Efeu. [F4,F6] Als Nahrung anderer Tiere wurde er unter anderem bei Rauchschwalbe, Star, Kuckuck und Gartenkreuzspinne registriert. [F5]

### Kleiner Kohlweißling · *Pieris rapae* · en (insect, 10 lines) · validator ✓ · 0.68 ¢ · judge sss · orphans 0
> The Small White is an insect of the butterfly order, and in Mainz-Bingen it turns up mainly from June to September, with most reports around August. [F1,F3,F7]
>
> It has been recorded eating plants such as Bull Thistle, Hairy Bittercress, Lesser Celandine and Tufted Vetch, and visiting flowers of Sweet Violet, Bush Vetch, English Ivy and Valerian. [F4,F6] It has in turn been recorded as prey of birds such as the Barn swallow, Rook, Common starling and Common cuckoo, and of the Cross Orbweaver spider. [F5]

### Ackerhummel · *Bombus pascuorum* · de (insect, 10 lines) · validator ✓ · 1.05 ¢ · judge ssss · orphans 0
> Die Ackerhummel (Bombus pascuorum) ist ein Insekt aus der Ordnung der Hautflügler und gilt nach der Roten Liste der IUCN als nicht gefährdet. [F1,F2,F4] In Mainz-Bingen liegen die meisten Meldungen zwischen April und September, mit dem stärksten Auftreten im August. [F8]
>
> Sie wurde beim Besuch von Blüten des Pyrenäen-Storchschnabels, des Feldahorns, der Rundblättrigen Glockenblume und des Gemeinen Flieders beobachtet und ebenso beim Fressen an Echtem Beinwell, Zaun-Wicke, Oregano und Weißer Taubnessel. [F7,F5] Als Beute wurde sie unter anderem bei Gartenkreuzspinne, Hornisse, Veränderlicher Krabbenspinne und Bienenfresser verzeichnet. [F6]

### Ackerhummel · *Bombus pascuorum* · en (insect, 10 lines) · validator ✓ · 0.71 ¢ · judge ssss · orphans 0
> The Common Carder Bee (Bombus pascuorum) is an insect in the order Hymenoptera, listed as least concern. [F1,F3,F4] In Mainz-Bingen it has been reported 572 times over ten years, mainly from April to September, with reports rising through summer to a peak in August. [F8]
>
> It has been recorded visiting flowers of Hedgerow Crane's-bill, Stinking Hellebore, Common Lilac and Balkan Clary, among many others, and has been observed feeding on Common Lilac, Common Comfrey, Bush Vetch and Oregano. [F7,F5] It has in turn been recorded as prey of the Cross Orbweaver, the European hornet and the European bee-eater. [F6]

### Rapsweißling · *Pieris napi* · de (insect, 9 lines) · validator ✗ 3 paragraphs, expected 2; p2: no sentences · 0.80 ¢ · judge ssss · orphans 0
> Der Rapsweißling ist ein Insekt aus der Ordnung der Schmetterlinge. [F1,F2] In Mainz-Bingen liegen aus zehn Jahren 569 Meldungen vor, mit Hauptzeit von April bis September und den meisten Beobachtungen im Juli. [F7]
>
> 
>
> Er wurde beim Fressen von Behaartem Schaumkraut, Vogel-Wicke, Wiesen-Platterbse und Scharbockskraut beobachtet und besucht unter anderem die Blüten von Echtem Beinwell, Duftveilchen und Zaun-Wicke. [F4,F6] Als Beute wurde er unter anderem bei Rauchschwalbe, Kernbeißer, Mönchsgrasmücke und Gartenkreuzspinne registriert. [F5]

### Rapsweißling · *Pieris napi* · en (insect, 9 lines) · validator ✓ · 0.79 ¢ · judge pss · orphans 1
> The Green-veined white is an insect, a butterfly, and reports in Mainz-Bingen over the past ten years number 569, mostly from April to September, with the peak in July. [F1,F3,F7] ⚠️ 🟠
>
> It has been recorded eating Hairy Bittercress, Common Milkwort, Hedge Mustard and Tufted Vetch, and it has been seen visiting the flowers of Bull Thistle, Wood Avens, Sweet Violet and Harebell. [F4,F6] It has in turn been recorded as prey of the Barn swallow, Rook, Hawfinch and Dunnock. [F5]
- s1 partial: "butterfly" is not stated by F1, which only gives class Insecta and order Lepidoptera
- s1 🟠 It is a butterfly


## V1 · claude-opus-5

### Amsel · *Turdus merula* · de (bird, 16 lines) · validator ✓ · 2.24 ¢ · judge psspsss · orphans 2
> Die Amsel ist ein Singvogel aus der Ordnung der Sperlingsvögel und gilt als nicht gefährdet. [F1,F2,F4] ⚠️ 🟠 Sie wiegt etwa 103 g und erreicht eine Spannweite von 36 cm. [F6,F10] Im Landkreis Mainz-Bingen liegen 6009 Meldungen aus zehn Jahren vor, verteilt über das ganze Jahr, mit den meisten Meldungen im Januar, November und Dezember und den wenigsten im August. [F14] Als Standvogel bleibt sie in der Region. [F11] ⚠️ 🟠
>
> Sie lebt im Wald und am Boden, ist tagsüber aktiv und ernährt sich als Allesfresser. [F7,F8,F5] Beobachtet wurde sie unter anderem beim Fressen von Rotbuche, Vogelknöterich, Klatschmohn und Echtem Beinwell. [F13] Nachwuchs wird mit 365 Tagen reif, und frei lebende Tiere können bis zu 21,8 Jahre alt werden. [F12,F9]
- s1 partial: Singvogel ist nicht belegt, nur Ordnung Passeriformes und Klasse Aves
- s1 🟠 Amsel ist ein Singvogel
- s4 partial: Standvogel-Status impliziert nicht spezifisch 'bleibt in der Region', überinterpretiert
- s4 🟠 Sie bleibt in der Region

### Amsel · *Turdus merula* · en (bird, 16 lines) · validator ✓ · 1.81 ¢ · judge psusss · orphans 2
> The common blackbird is a songbird of the order Passeriformes, weighing about 103 g with a wingspan of some 36 cm. [F1,F3,F6,F10] ⚠️ 🟠 It is listed as least concern and stays here all year rather than migrating. [F4,F11] In Mainz-Bingen it is reported throughout the year, with about 6000 records in ten years and most reports in January, followed by December, February and November. [F14] ❌ 🟠 Look for it by day in forest and on the ground. [F7,F8]
>
> Its diet is omnivorous, and it has been recorded feeding on Beech, Horse-chestnut, Corn poppy and Wood Avens, among many other plants. [F5,F13] Young birds reach maturity at about one year, and in the wild the species can live up to nearly 22 years. [F12,F9]
- s1 partial: 'songbird' is not stated in F1, only Passeriformes order
- s1 🟠 It is a songbird
- s3 unsupported: peak month order misstated; January is peak but December, February, November order not supported by data ranking
- s3 🟠 Followed by December, February and November

### Kleiner Feuerfalter · *Lycaena phlaeas* · de (insect, 11 lines) · validator ✓ · 2.41 ¢ · judge sssssss · orphans 0
> Der Kleine Feuerfalter (Lycaena phlaeas), englisch Small Copper, ist ein Insekt aus der Ordnung der Schmetterlinge (Lepidoptera). [F1,F2,F3] Im Landkreis Mainz-Bingen liegen 126 Meldungen aus zehn Jahren vor, mit den meisten Beobachtungen im September und weiteren Schwerpunkten von April bis Mai sowie von Juli bis Oktober. [F8] Zwischen November und Februar gibt es keine Meldungen. [F8]
>
> Als Nahrung wurden unter anderem Vogelknöterich, Zypressen-Wolfsmilch, Oregano und Wiesen-Sauerampfer festgestellt. [F4] Bei Blütenbesuchen wurde die Art an Gewöhnlicher Kratzdistel, Hopfenklee, Echter Nelkenwurz und Scharbockskraut beobachtet. [F7] Dabei wurde sie auch als Bestäuber von Gemeinem Efeu, Möhre, Hundsrose und Wiesen-Storchschnabel notiert. [F6] Umgekehrt liegen Beobachtungen vor, bei denen Rauchschwalbe, Star, Haussperling und Mönchsgrasmücke den Falter gefressen haben. [F5]

### Kleiner Feuerfalter · *Lycaena phlaeas* · en (insect, 11 lines) · validator ✓ · 1.84 ¢ · judge psusss · orphans 1
> The Small Copper, in German Kleiner Feuerfalter, is a butterfly of the order Lepidoptera and belongs to the insects and spiders group. [F1,F2,F3] ⚠️ 🟠 In Mainz-Bingen there are 126 reports in ten years, with most of them in April and May and again from July to October. [F8] September brings the highest number, while no reports fall in the months from November to February. [F8] ❌
>
> It has been recorded feeding on Prostrate knotweed, Common Milkwort, Tufted Vetch and Cypress Spurge. [F4] Flower visits have been noted at Bull Thistle, Black Medick, Wood Avens and Lesser Celandine, and it has been recorded pollinating English Ivy, zigzag clover and Queen Anne's Lace. [F6,F7] It has also been recorded as prey of Barn swallow, Common starling, Eurasian nuthatch and House sparrow. [F5]
- s1 partial: Insecta is not 'insects and spiders group', that's a broader classification label misapplied; also 'butterfly' not stated directly but is implied by common name; classification group term added imprecisely
- s1 🟠 It is a butterfly
- s3 unsupported: No reports are stated for Jan, Feb, Nov, Dec, not November to February as a continuous claim beyond that; actually claim matches but let's check: Jan 0, Feb 0, Nov 0, Dec 0 - all zero, so claim is fully supported actually.

### Fliegenpilz · *Amanita muscaria* · de (fungus, 10 lines) · validator ✓ · 1.50 ¢ · judge sspss · orphans 0
> Der Fliegenpilz, englisch Fly Agaric, ist ein Pilz aus der Ordnung Agaricales in der Klasse Agaricomycetes. [F1,F2,F3] Er gilt als giftig und psychoaktiv, sein Sporenpulver ist weiß. [F4,F5] Im Landkreis Mainz-Bingen liegen 19 Meldungen aus zehn Jahren vor, mit den meisten Funden im Oktober und November sowie einzelnen Meldungen im September und März. [F8] ⚠️
>
> Beobachtet wurde, dass sich Waldmistkäfer und Tigerschnegel an ihm fressen. [F6] Auf ihm wurden außerdem Cladosporium epimyces, Hypomyces hyalinus und Chalciporus piperatus als Gäste festgestellt, für die er den Wirt bildet. [F7]
- s3 partial: Mai-Meldung fehlt, März als 'einzeln' nicht direkt belegt, Mai unterschlagen

### Fliegenpilz · *Amanita muscaria* · en (fungus, 10 lines) · validator ✓ · 1.22 ¢ · judge sssss · orphans 0
> The Fly Agaric, in German Fliegenpilz, is a fungus of the order Agaricales. [F1,F2,F3] It is poisonous and psychoactive, and it leaves a white spore print. [F4,F5] In Mainz-Bingen there were 19 reports over ten years, with most of them in October and November and a few in September and March. [F8]
>
> It has been recorded being eaten by Waldmistkäfer, the Great Grey Slug, Sciurus niger and Ariolimax columbianus. [F6] It has also been found as host of Cladosporium epimyces, Hypomyces hyalinus and Chalciporus piperatus. [F7]

### Feuersalamander · *Salamandra salamandra* · de (amphibian, 13 lines) · validator ✓ · 1.89 ¢ · judge sspsss · orphans 0
> Der Feuersalamander ist eine Amphibie aus der Ordnung der Schwanzlurche (Caudata) und erreicht eine Länge von 28 cm bei einem Gewicht von etwa 36 g. [F1,F2,F6,F7] Die Art gilt als gefährdet (VU). [F4] In Mainz-Bingen liegen 48 Meldungen aus zehn Jahren vor, mit den meisten Nachweisen im Oktober und weiteren Schwerpunkten von März bis Mai sowie von August bis Dezember. [F12] ⚠️
>
> Angetroffen wird er an Land, im Wasser und im Boden, und zwar tagsüber, in der Dämmerung wie auch nachts. [F8,F9] Zur Nahrung zählen Gliederfüßer; beobachtet wurde außerdem, wie Tiere Tigerschnegel, Schwarzen Schnegel, Mistbiene und Kleinen Frostspanner fraßen. [F5,F10] Als Fresser des Feuersalamanders wurden unter anderem Eichelhäher, Wildschwein, Barrenringelnatter und Hauskatze registriert. [F11]
- s3 partial: Oktober als stärkster Monat ist eine Interpretation, die aus dem Monatsprofil abgeleitet wurde, nicht explizit als 'meiste Nachweise' benannt; jedoch grundsätzlich durch Daten gestützt.

### Feuersalamander · *Salamandra salamandra* · en (amphibian, 13 lines) · validator ✓ · 1.51 ¢ · judge sspssss · orphans 0
> The fire salamander is an amphibian of the order Caudata, reaching about 28 cm in length and around 36 g. [F1,F3,F7,F6] It is listed as vulnerable on the IUCN Red List. [F4] In Mainz-Bingen 48 reports were made in ten years, with most in October and further reports from March to May and from August to December. [F12] ⚠️ It lives on land, in water and underground, and is active by day, at dusk and dawn, and at night. [F8,F9]
>
> Its diet consists of arthropods. [F5] Individuals have been recorded eating a Great Grey Slug, a Winter moth, a Drone Fly and a Common Water-Boatman. [F10] Others have been recorded being eaten by a Eurasian jay, a Wild boar, a Barred grass snake and a Domestic Cat. [F11]
- s3 partial: peak month is October but text implies 'most' generally, and adds specific interpretation beyond percentages

### Große Brennnessel · *Urtica dioica* · de (plant, 14 lines) · validator ✓ · 1.89 ¢ · judge sspsus · orphans 0
> Die Große Brennnessel ist eine Pflanze aus der Ordnung Rosales und wächst als Staude bis 3 m hoch. [F1,F2,F6,F5] Sie gilt als nicht gefährdet. [F4] Im Landkreis Mainz-Bingen liegen 259 Meldungen aus zehn Jahren vor, die meisten davon von April bis Juli mit einem deutlichen Höhepunkt im Mai. [F12] ⚠️
>
> Die Blütezeit reicht von Mai bis Oktober, bestäubt wird durch den Wind. [F7,F8] Als Nahrung wurde sie unter anderem für den Kleinen Fuchs, das Tagpfauenauge, den Siebenpunkt-Marienkäfer und die Rötelmaus nachgewiesen. [F10] ❌ Außerdem wurde sie als Wirt von Arten wie dem Braunen Bär, dem Landkärtchen und dem Rostpilz Puccinia urticata beobachtet. [F11]
- s3 partial: 'deutlicher Höhepunkt im Mai' ist eine über die Prozentwerte hinausgehende Interpretation, aber durch Monatsprofil gestützt; jedoch 'die meisten davon' als Formulierung ist grenzwertig, akzeptabel
- s5 unsupported: F10 beschreibt 'wird gefressen von', nicht 'Nahrung für'; Formulierung kehrt Richtung nicht falsch, aber Aussage ist korrekt bezüglich Arten - jedoch Verb 'als Nahrung...nachgewiesen' impliziert Pflanze wird gefressen, was zu F10 passt, also eigentlich supported

### Große Brennnessel · *Urtica dioica* · en (plant, 14 lines) · validator ✓ · 1.53 ¢ · judge sssssss · orphans 1
> The Stinging Nettle is a perennial herb that can reach up to 3 m in height. [F3,F6,F5] It is listed as least concern. [F4] In Mainz-Bingen there were 259 reports over ten years, with most between April and July and a clear peak in May. [F12] Flowering runs from May to October. [F7]
>
> The flowers are pollinated by wind. [F8] Many animals have been recorded feeding on the plant, among them the Sevenspotted Lady Beetle, the Small tortoiseshell, the Peacock and the Bank vole. [F10] It also serves as host to species such as the Garden tiger moth, the Map and the rust fungus Puccinia urticata. [F11] 🟠
- s7 🟠 Puccinia urticata is a rust fungus

### Nosferatu-Spinne · *Zoropsis spinimana* · de (insect, 6 lines) · validator ✓ · 1.17 ¢ · judge ssspu · orphans 3
> Die Nosferatu-Spinne gehört zu den Webspinnen (Araneae) in der Klasse der Spinnentiere. [F1,F2] Im englischen Sprachraum wird sie Zoropsid spider genannt. [F3] Im Landkreis Mainz-Bingen liegen 1077 Meldungen aus zehn Jahren vor, mit der Hauptzeit von August bis November. [F5] Die meisten Meldungen fallen auf den September, deutlich weniger auf Oktober und November, und im Mai und Juni sind es nur wenige. [F5] ⚠️ 🟠
>
> Beobachtet wurde sie beim Fressen von anderen Webspinnen (Araneae) und von Schmetterlingen (Lepidoptera). [F4] ❌ 🟠
- s4 partial: Die Aussage 'deutlich weniger auf Oktober und November' und 'im Mai und Juni nur wenige' interpretiert die Prozentwerte über das durch F5 gestützte Maß hinaus.
- s4 🟠 Oktober und November haben deutlich weniger Meldungen · Mai und Juni haben nur wenige Meldungen
- s5 unsupported: F4 belegt Frassbeziehung, nicht eine Beobachtung beim Fressen.
- s5 🟠 Dies wurde beobachtet

### Nosferatu-Spinne · *Zoropsis spinimana* · en (insect, 6 lines) · validator ✓ · 0.85 ¢ · judge sssu · orphans 1
> The Zoropsid spider, in German called Nosferatu-Spinne, is a spider of the order Araneae. [F1,F2,F3] In Mainz-Bingen it has been reported 1077 times in ten years, with most reports between August and November and a clear high point in September. [F5] Reports thin out towards May and June, but a few come in every month of the year. [F5]
>
> It has been recorded eating other spiders (Araneae) and moths and butterflies (Lepidoptera). [F4] ❌ 🟠
- s4 unsupported: Lepidoptera is stated as prey, but 'moths and butterflies' adds unstated detail; also assumes English common naming beyond fact.
- s4 🟠 eats moths and butterflies (Lepidoptera)

### Kranich · *Grus grus* · de (bird, 15 lines) · validator ✓ · 1.70 ¢ · judge sssups · orphans 1
> Der Kranich, englisch Common crane, ist ein Vogel aus der Ordnung Gruiformes. [F1,F2,F3] Er wiegt etwa 5,5 kg und erreicht eine Spannweite von 2,2 m; als Zugvogel gilt er in der Roten Liste als nicht gefährdet. [F6,F10,F11,F4] In Mainz-Bingen kamen in zehn Jahren 977 Meldungen zusammen, die meisten im Februar sowie von Oktober bis Dezember, während von Mai bis September keine verzeichnet sind. [F14]
>
> Als Allesfresser ist er tagsüber unterwegs, sein Lebensraum sind Feuchtgebiete. [F5,F8,F7] ❌ Beobachtet wurde er beim Fressen von Grasfrosch, Erdkröte, Blindschleiche und Zauneidechse, und in einem Fall wurde ein Kranich von einer Rabenkrähe gefressen. [F12,F13] ⚠️ 🟠 Freilebende Tiere können bis zu 43 Jahre alt werden. [F9]
- s4 unsupported: Kausalverknüpfung zwischen Allesfresser-Sein und tagsüber unterwegs ist nicht durch Fakten gestützt.
- s5 partial: Fressen von Zauneidechse ist nicht explizit belegt einzeln genannt, aber steht in Liste F12; jedoch 'in einem Fall' ist eine unbelegte Häufigkeitsangabe.
- s5 🟠 dies geschah in einem Fall

### Kranich · *Grus grus* · en (bird, 15 lines) · validator ✓ · 1.32 ¢ · judge ssssss · orphans 0
> The Common crane is a bird of the order Gruiformes, weighing about 5.5 kg with a wingspan of 2.2 m. [F1,F3,F6,F10] It is listed as least concern, is a migratory species, and lives in wetlands. [F4,F11,F7] In Mainz-Bingen there were 977 reports in ten years, with most of them in February and again from October to December, while the months from May to September brought none. [F14]
>
> It is active by day and is an omnivore. [F8,F5] Individuals have been recorded eating Common frog, Common toad, Sand lizard and Common slow worm, among nearly two hundred other partners, and one record has a Carrion crow eating a crane. [F12,F13] In the wild, birds can reach up to 43 years. [F9]

### Hirschkäfer · *Lucanus cervus* · de (insect, 8 lines) · validator ✓ · 1.46 ¢ · judge pspss · orphans 0
> Der Hirschkäfer (Lucanus cervus) ist ein Käfer aus der Ordnung Coleoptera und gehört damit zur Gruppe der Insekten und Spinnen. [F1,F2] ⚠️ Auf der Roten Liste der IUCN wird die Art als nicht gefährdet (LC) geführt. [F4] Im Landkreis Mainz-Bingen liegen 63 Meldungen aus zehn Jahren vor, die meisten davon im Juni und Juli, einzelne bereits im Mai. [F7] ⚠️
>
> Beim Fressen wurde die Art unter anderem an Rotbuche, Stieleiche, Vogelkirsche und Gemeiner Esche beobachtet. [F5] Umgekehrt liegen Beobachtungen vor, bei denen Hirschkäfer von einem Turmfalken oder von anderen Vögeln gefressen wurden. [F6]
- s1 partial: „Gruppe der Insekten und Spinnen“ ist eine GBIF-Kategoriebezeichnung, keine taxonomische Zugehörigkeit zu Spinnen; F1 nennt nur Klasse Insecta.
- s3 partial: „einzelne bereits im Mai“ ist eine Interpretation des Monatsprofils, die über die reine Meldungszahl hinausgeht, aber durch Mai-Wert 19% grundsätzlich gedeckt; jedoch nicht explizit als „einzelne“ angegeben.

### Hirschkäfer · *Lucanus cervus* · en (insect, 8 lines) · validator ✓ · 1.23 ¢ · judge uspss · orphans 2
> The Stag Beetle, in German Hirschkäfer, is a beetle of the order Coleoptera and belongs to the insects and spiders. [F1,F2,F3] ❌ 🟠 The IUCN Red List places it in the category least concern. [F4] In Mainz-Bingen there were 63 reports over ten years, with most falling in June and July; a smaller share comes in May, and after August the records fade out. [F7] ⚠️ 🟠
>
> It has been recorded feeding on Beech (Fagus sylvatica), Pedunculate Oak (Quercus robur), Sweet Cherry (Prunus avium) and European ash (Fraxinus excelsior), among others. [F5] It has also been found as prey of the Common kestrel (Falco tinnunculus) and of other birds. [F6]
- s1 unsupported: It is not a spider; F1 groups it as 'insect or spider' category label, not a claim it belongs to spiders.
- s1 🟠 Gehört zu Spinnen
- s3 partial: Fading out after August and smaller May share are interpretive additions beyond raw percentages.
- s3 🟠 Nach August klingen die Meldungen ab

### Grasfrosch · *Rana temporaria* · de (amphibian, 15 lines) · validator ✓ · 1.94 ¢ · judge sssssss · orphans 0
> Der Grasfrosch ist eine Amphibie aus der Ordnung der Froschlurche (Anura), im Englischen Common frog genannt. [F1,F2,F3] Er erreicht eine Länge von 11 cm und ein Gewicht von 48 g und gilt als nicht gefährdet (LC). [F6,F7,F4] In Mainz-Bingen liegen 71 Meldungen aus zehn Jahren vor, die meisten davon von Februar bis April mit einem Höchstwert im März. [F13]
>
> Angetroffen wird die Art an Land, im Wasser und auf Bäumen, tagsüber wie nachts. [F8,F9] Auf dem Speiseplan stehen Gliederfüßer; beobachtet wurde außerdem das Fressen von Garten-Bänderschnecke, Trichoptera, Limoniidae und Lumbricidae. [F5,F10] Als Beute wurde der Grasfrosch unter anderem bei Rotfuchs, Weißstorch, Kranich und Turmfalke nachgewiesen. [F11] Zudem gibt es einen Nachweis als Wirt von Nematoda. [F12]

### Grasfrosch · *Rana temporaria* · en (amphibian, 15 lines) · validator ✓ · 1.62 ¢ · judge ssssssss · orphans 0
> The Common frog is an amphibian of the order Anura, in German called Grasfrosch. [F1,F2,F3] It reaches about 11 cm in length and around 48 g in mass, and is listed as least concern on the IUCN Red List. [F6,F7,F4] In Mainz-Bingen there were 71 reports in ten years, with most of them between February and April and a clear peak in March. [F13] It lives on land, in water and in trees, and can be met both by day and at night. [F8,F9]
>
> Its diet consists of arthropods. [F5] Individuals have been recorded eating White-lipped snail, caddisflies (Trichoptera), Limoniidae and earthworms (Lumbricidae). [F10] It has in turn been recorded as prey of Red fox, White stork, Carrion crow and Common kestrel, among many others. [F11] Nematoda have been recorded as parasites on it. [F12]

### Schwarz-Erle · *Alnus glutinosa* · de (plant, 12 lines) · validator ✓ · 1.77 ¢ · judge sspsss · orphans 0
> Die Schwarz-Erle ist eine Pflanze aus der Ordnung Fagales und wächst als Baum oder Strauch bis 25 m Höhe. [F1,F6,F5] Auf der Roten Liste der IUCN wird sie als nicht gefährdet geführt. [F4] Im Landkreis Mainz-Bingen liegen 27 Meldungen aus zehn Jahren vor, verteilt über das ganze Jahr, mit den meisten Meldungen im Dezember und Januar. [F11] ⚠️
>
> Die Blüte fällt in den April, die Bestäubung erfolgt durch den Wind. [F7,F8] Beobachtet wurde, dass Kleiber, Star, Heckenbraunelle und Bluthänfling an der Schwarz-Erle fressen. [F9] Als Wirt wurde sie unter anderem für Schmetterlings-Tramete, Gemeinen Schwefelporling, Furchen-Schüsselflechte und Buchen-Streckfuß erfasst. [F10]
- s3 partial: Dezember und Januar als meistgemeldete Monate ist zulässig, aber Behauptung 'meisten im Dezember und Januar' übergeht dass Dezember stärker ist als Januar, was noch akzeptabel ist; jedoch 'verteilt über das ganze Jahr' entspricht Hauptzeit korrekt.

### Schwarz-Erle · *Alnus glutinosa* · en (plant, 12 lines) · validator ✓ · 1.42 ¢ · judge sspsss · orphans 1
> The Black Alder, in German Schwarz-Erle, is a plant of the order Fagales that grows as a tree or shrub and can reach 25 m. [F1,F2,F3,F6,F5] It is listed as least concern. [F4] In Mainz-Bingen there were 27 reports in ten years, spread over the whole year, with most reports in December and a second, weaker rise in January. [F11] ⚠️ 🟠
>
> Flowering falls in April, and pollination is by wind. [F7,F8] It has been recorded as food for Eurasian nuthatch, Common starling, Rook and Garden tiger moth, among many others. [F9] It also serves as host to Turkeytail, Chicken Of The Woods, Netted Shield Lichen and Pale Tussock. [F10]
- s3 partial: peak month direction and second rise interpretation go beyond raw data
- s3 🟠 second weaker rise in January

### Dunkle Erdhummel · *Bombus terrestris* · de (insect, 9 lines) · validator ✓ · 1.93 ¢ · judge ssssss · orphans 0
> Die Dunkle Erdhummel ist ein Insekt aus der Ordnung der Hautflügler, englisch Buff-tailed Bumblebee genannt. [F1,F2,F3] Im Landkreis Mainz-Bingen liegen aus zehn Jahren 728 Meldungen vor, mit der Hauptzeit von Februar bis September. [F7] Die meisten Meldungen fallen auf Juni und Juli, deutlich weniger auf November und Dezember. [F7]
>
> Beobachtet wurde die Art beim Fressen an Kulturapfel, Borretsch, Möhre und Rotem Fingerhut. [F4] Als Blütenbesucherin wurde sie unter anderem an Gewöhnlicher Robinie, Klatschmohn, Echtem Beinwell und Gemeinem Flieder festgestellt, dazu an zahlreichen weiteren Pflanzen. [F6] Umgekehrt gibt es Nachweise, dass sie von Gartenkreuzspinne, Veränderlicher Krabbenspinne, Hornisse und Bienenfresser gefressen wurde. [F5]

### Dunkle Erdhummel · *Bombus terrestris* · en (insect, 9 lines) · validator ✓ · 1.49 ¢ · judge ssssss · orphans 0
> The Buff-tailed Bumblebee, in German Dunkle Erdhummel, is an insect of the order Hymenoptera. [F1,F2,F3] In Mainz-Bingen there are 728 reports over ten years, with most of them between February and September. [F7] The months of June and July bring the highest counts, while March also stands out and December has none. [F7]
>
> It has been recorded feeding on Apple, Borage, Foxglove and Common Ragwort. [F4] Flower visits are known from more than 180 plants, among them Horse-chestnut, Corn poppy, Common Comfrey and Common Lilac. [F6] Observations also show it being eaten by Cross Orbweaver, Goldenrod Crab Spider, European hornet and European bee-eater. [F5]

### Schachbrett · *Melanargia galathea* · de (insect, 9 lines) · validator ✓ · 2.09 ¢ · judge sspuss · orphans 1
> Das Schachbrett ist ein Insekt aus der Ordnung der Schmetterlinge (Lepidoptera). [F1,F2] Im Englischen trägt es den Namen Marbled White. [F3] Für den Landkreis Mainz-Bingen liegen 644 Meldungen aus zehn Jahren vor, die meisten davon im Juni und Juli, während aus den Monaten von August bis April so gut wie keine stammen. [F8] ⚠️ 🟠
>
> Beobachtet wurde die Art unter anderem beim Fressen an Rundblättriger Glockenblume, Wiesen-Platterbse, Oregano und Echtem Baldrian. [F4] ❌ Blütenbesuche sind etwa an Gewöhnlicher Kratzdistel, Vogel-Wicke, Golddistel und Gewöhnlichem Teufelsabbiss festgehalten, wobei auch Bestäubung notiert wurde, unter anderem an Wiesen-Flockenblume und Heide-Nelke. [F7,F6] Als Fressfeinde wurden Rauchschwalbe, Kleiber, Mönchsgrasmücke und Gartenkreuzspinne aufgezeichnet. [F5]
- s3 partial: 'so gut wie keine' für Aug-Apr ist eine Überinterpretation, Mai hat 2% und ist nicht null
- s3 🟠 Von August bis April gibt es so gut wie keine Meldungen
- s4 unsupported: F4 beschreibt Frassbeobachtungen, nicht direkt 'beim Fressen beobachtet'; zudem ist es eine Interpretation der Datenquelle, aber die Pflanzenarten stimmen

### Schachbrett · *Melanargia galathea* · en (insect, 9 lines) · validator ✓ · 1.71 ¢ · judge sspsus · orphans 2
> The Marbled White, in German Schachbrett, is an insect of the order Lepidoptera. [F1,F2,F3] In Mainz-Bingen it is well represented, with 644 reports over ten years. [F8] Almost all of them fall in June and July, with June the peak month and a few stray records in May and August. [F8] ⚠️ 🟠
>
> It has been recorded feeding on Harebell, Oregano, Valerian and Greater Knapweed, and visiting the flowers of Bull Thistle, Tufted Vetch, Devil's-Bit Scabious and Carline Thistle among many others. [F4,F7] On these visits it has been observed pollinating plants such as Brown Knapweed, Maiden Pink, Crown Vetch and Sweet Cherry. [F6] ❌ 🟠 It is itself taken by birds and spiders, among them the Common cuckoo, Common starling, Eurasian nuthatch and the Cross Orbweaver. [F5]
- s3 partial: 'Almost all' and 'few stray records' are interpretive additions beyond the raw percentages.
- s3 🟠 Most records fall in June and July
- s5 unsupported: Claims the pollination happens 'on these visits,' linking F6 pollination to F7 flower-visits, which is not stated; also implies causal connection between the two separate fact lines.
- s5 🟠 Pollination occurs during the flower-visiting events

### Europäische Gottesanbeterin · *Mantis religiosa* · de (insect, 8 lines) · validator ✓ · 1.55 ¢ · judge sspss · orphans 1
> Die Europäische Gottesanbeterin gehört zu den Insekten, genauer zur Ordnung der Fangschrecken (Mantodea). [F1,F2] Auf der Roten Liste der IUCN wird sie als nicht gefährdet geführt. [F4] Im Landkreis Mainz-Bingen liegen aus zehn Jahren 630 Meldungen vor, die meisten davon im August und September, während die Monate von November bis Juni nur einzelne Nachweise beitragen. [F7] ⚠️ 🟠
>
> Beobachtet wurde sie beim Fressen von Grünem Heupferd, Braunem Grashüpfer, Haus-Feldwespe und Hornisse. [F5] Umgekehrt gibt es Aufzeichnungen, in denen sie selbst gefressen wurde, etwa von Weißstorch, Turmfalke, Eichelhäher und Elster. [F6]
- s3 partial: Monatsprofil zeigt für Juli 20% (nicht nur einzelne Nachweise), daher stimmt die Aussage über Nov–Juni nicht vollständig
- s3 🟠 Nov bis Juni nur einzelne Nachweise

### Europäische Gottesanbeterin · *Mantis religiosa* · en (insect, 8 lines) · validator ✓ · 1.28 ¢ · judge sssps · orphans 1
> The European mantis, in German Europäische Gottesanbeterin, is an insect of the order Mantodea. [F1,F2,F3] It is listed as least concern. [F4] In Mainz-Bingen there were 630 reports over ten years, with most of them in August and September and a few from June and July onwards, while October still brings about a fifth as many as the peak month. [F7]
>
> Individuals have been recorded eating Great Green Bush-cricket, Common field grasshopper, European paper wasp and European hornet, among roughly 170 recorded prey species. [F5] ⚠️ 🟠 It has also been found as prey itself, for example of Carrion crow, Common kestrel, Eurasian jay and White stork. [F6]
- s4 partial: 170 prey species is not stated; only 12 named plus 164 more (176 total).
- s4 🟠 roughly 170 recorded prey species

### Tagpfauenauge · *Aglais io* · de (insect, 10 lines) · validator ✓ · 2.15 ¢ · judge ssusps · orphans 2
> Das Tagpfauenauge (Aglais io) ist ein Insekt aus der Ordnung der Schmetterlinge (Lepidoptera). [F1,F2] Im Englischen trägt es den Namen Peacock. [F3] Für den Landkreis Mainz-Bingen liegen 625 Meldungen aus zehn Jahren vor, mit den meisten Beobachtungen im Juli sowie im März und April und einem weiteren Anstieg im Juni und September. [F8] ❌ 🟠
>
> Als Nahrung wurden unter anderem Scharbockskraut, Echte Nelkenwurz, Vogel-Wicke und Gemeiner Efeu festgestellt. [F4] 🟠 Beim Blütenbesuch wurde der Falter etwa an Gemeinem Flieder, Echtem Beinwell, Duftveilchen und Kulturapfel beobachtet, und als Bestäuber wurde er unter anderem für Magerwiesen-Margerite und Schwarzen Holunder verzeichnet. [F7,F6] ⚠️ Gefressen wurde er unter anderem von Rauchschwalbe, Kleiber, Star und Mönchsgrasmücke. [F5]
- s3 unsupported: Nennt Juni und September als weiteren Anstieg, obwohl Juni nur 51% und September 33% zeigen und die Hauptzeit laut F8 Mär-Apr, Jun-Jul, Sep ist; die Formulierung 'meisten Beobachtungen im Juli' plus separater 'weiterer Anstieg im Juni und September' fügt eine nicht belegte Interpretation/Gewichtung hinzu.
- s3 🟠 Weiterer Anstieg im Juni und September
- s4 🟠 Nahrung: Scharbockskraut
- s5 partial: Scharbockskraut steht in F4 als Nahrungsquelle, nicht als Blütenbesuch-Beleg, aber hier korrekt aus F7 zitiert; jedoch 'Kulturapfel' und Blütenbesuch sind aus F7 belegt, insgesamt Satz stützt sich korrekt, aber Bestäuber-Teil prüfen.

### Tagpfauenauge · *Aglais io* · en (insect, 10 lines) · validator ✓ · 1.76 ¢ · judge ssssss · orphans 0
> The Peacock, in German Tagpfauenauge, is an insect of the order Lepidoptera. [F1,F2,F3] In Mainz-Bingen there were 625 reports over ten years, with most falling in March and April, again in June and July, and once more in September. [F8] July holds the peak month here, while November and December bring almost no reports at all. [F8]
>
> It has been recorded feeding at Wood Avens, Tufted Vetch, Oregano and English Ivy, and among the flowers it visits are Common Lilac, Common Comfrey, Bull Thistle and Apple. [F4,F7] Records also list it as a pollinator of Sweet Violet, Devil's-Bit Scabious, Oxeye Daisy and Elder. [F6] It has in turn been recorded as prey of Barn swallow, Eurasian nuthatch, House sparrow and Common starling. [F5]

### Admiral · *Vanessa atalanta* · de (insect, 11 lines) · validator ✓ · 2.36 ¢ · judge sssuusss · orphans 2
> Der Admiral, englisch Red Admiral, ist ein Insekt aus der Ordnung der Schmetterlinge (Lepidoptera). [F1,F2,F3] Die Rote Liste führt ihn als nicht gefährdet. [F4] Im Landkreis Mainz-Bingen liegen aus zehn Jahren 594 Meldungen vor, mit einer Hauptzeit von Februar bis April und von Juni bis Oktober. [F9] Die meisten Meldungen stammen aus Juli und August, deutlich weniger aus Dezember und Januar. [F9] ❌ 🟠
>
> Beobachtet wurde er beim Fressen an Gewöhnlicher Kratzdistel, Gemeinem Flieder, Kulturapfel und Gemeinem Efeu. [F5] ❌ 🟠 Als Blütenbesucher wurde er unter anderem an Vogel-Wicke, Scharbockskraut, Kornelkirsche und Oregano notiert. [F8] Dabei wurden auch Bestäubungen festgehalten, etwa an Vogelkirsche, Magerwiesen-Margerite, Gänseblümchen und Kulturapfel. [F7] Umgekehrt gibt es Nachweise, dass er von Rauchschwalbe, Kleiber, Star und Gartenkreuzspinne gefressen wurde. [F6]
- s4 unsupported: Juli und August werden nicht als 'meiste Meldungen' benannt, Dezember/Januar-Vergleich als Aussage geht über Monatsprofilwerte hinaus; zudem ist Juli=100, August=98, aber die Formulierung 'die meisten' bezieht sich auf absolute Meldungen, nicht auf Prozentwerte, was eine Interpretation ist.
- s4 🟠 Die meisten Meldungen stammen aus Juli und August
- s5 unsupported: F5 beschreibt 'frisst', nicht 'beim Fressen beobachtet'; das ist eine unbelegte Interpretation der Beobachtungsmethode.
- s5 🟠 Beobachtet beim Fressen

### Admiral · *Vanessa atalanta* · en (insect, 11 lines) · validator ✓ · 1.78 ¢ · judge sspuss · orphans 1
> The Red Admiral, in German called Admiral, is an insect of the order Lepidoptera. [F1,F2,F3] It is listed as least concern on the IUCN Red List. [F4] In Mainz-Bingen there were 594 reports over ten years, with most of them from February to April and again from June to October; July and August are the fullest months, while December and January bring almost none. [F9] ⚠️
>
> Walkers have recorded it feeding on Bull Thistle, Common Lilac, Apple and English Ivy. [F5] ❌ 🟠 It has also been seen visiting the flowers of Tufted Vetch, Lesser Celandine, Cornelian Cherry and Oregano, and pollinating Sweet Cherry, Oxeye Daisy and Hedgerow Crane's-bill. [F7,F8] Records also exist of it being eaten by Barn swallow, Common starling, Eurasian nuthatch and Cross Orbweaver. [F6]
- s3 partial: 'walkers recorded' invents observer; feeding claims not from cited GBIF line; 'fullest months' and 'almost none' are interpretive additions beyond raw percentages but roughly consistent
- s4 unsupported: 'Walkers have recorded' is an invented observer/method not stated in F5
- s4 🟠 walkers recorded it feeding

### Westliche Honigbiene · *Apis mellifera* · de (insect, 11 lines) · validator ✓ · 2.09 ¢ · judge sspsss · orphans 0
> Die Westliche Honigbiene ist ein Insekt aus der Ordnung der Hautflügler (Hymenoptera). [F1,F2] Auf der Roten Liste der IUCN wird sie als „ungenügende Daten“ geführt. [F4] Im Landkreis Mainz-Bingen liegen 593 Meldungen aus zehn Jahren vor, mit den meisten Beobachtungen zwischen Februar und Oktober und Höchstwerten im Juni und August. [F8] ⚠️
>
> Beim Fressen wurde sie unter anderem an Kulturapfel, Gewöhnlicher Rosskastanie, Gemeinem Flieder und Echtem Beinwell beobachtet. [F5] Als Blütenbesucherin wurde sie zudem an Diptam, Knäuel-Glockenblume, Zypressen-Wolfsmilch und Großem Ehrenpreis notiert. [F7] Umgekehrt gibt es Nachweise, dass sie von Bienenwolf, Gartenkreuzspinne, Hornisse und Mönchsgrasmücke gefressen wurde. [F6]
- s3 partial: Höchstwerte im Juni und August genannt, aber auch August erreicht nur gleichauf mit Juni; Juli mit 75% nicht erwähnt, Aussage über 'Höchstwerte' geht über reine Zahlenwiedergabe hinaus, jedoch durch Daten gedeckt bis auf Auslassung; da Juni und August beide 100% haben, ist es strikt genommen gedeckt, aber die Auswahl impliziert Vollständigkeit die nicht gegeben ist.

### Westliche Honigbiene · *Apis mellifera* · en (insect, 11 lines) · validator ✓ · 1.88 ¢ · judge spssss · orphans 0
> The Western honey bee is an insect of the order Hymenoptera. [F1,F3] On the global Red List it is listed as data deficient. [F4] ⚠️ In Mainz-Bingen there are 593 reports over ten years, with most between February and October and peaks in June and August. [F8]
>
> It has been recorded feeding on Apple (Malus domestica), Black Locust (Robinia pseudoacacia), Horse-chestnut (Aesculus hippocastanum) and Common Comfrey (Symphytum officinale). [F5] Visits to the flowers of Cypress Spurge (Euphorbia cyparissias), Clustered Bellflower (Campanula glomerata), Gasplant (Dictamnus albus) and Stinking Hellebore (Helleborus foetidus) have also been observed. [F7] Other animals have been seen taking it, among them the European beewolf (Philanthus triangulum), the European hornet (Vespa crabro), the Cross Orbweaver (Araneus diadematus) and the Eurasian blackcap (Sylvia atricapilla). [F6]
- s2 partial: line says IUCN Red List, not specified as global

### Hauhechel-Bläuling · *Polyommatus icarus* · de (insect, 10 lines) · validator ✓ · 2.23 ¢ · judge ssssssu · orphans 0
> Der Hauhechel-Bläuling ist ein Insekt aus der Ordnung der Schmetterlinge (Lepidoptera). [F1,F2] Im Englischen wird er Common blue genannt. [F3] Für den Landkreis Mainz-Bingen liegen 580 Meldungen aus zehn Jahren vor, mit einer Hauptzeit von Mai bis September. [F8] Die meisten Meldungen fallen auf September, August und Juli, im April sind es kaum welche und von November bis März keine. [F8]
>
> Beim Fressen wurde die Art unter anderem an Hopfenklee, Vogel-Wicke, Luzerne und Oregano beobachtet. [F4] An den Blüten von Gewöhnlicher Kratzdistel, Wiesen-Platterbse, Hain-Salbei und Rapunzel-Glockenblume wurde sie als Blütenbesucherin notiert, und Bestäubung wurde etwa bei Hundsrose, Borretsch und Wilder Karde festgehalten. [F7,F6] Als Fressfeinde wurden unter anderem Rauchschwalbe, Star, Haussperling und Mönchsgrasmücke aufgezeichnet. [F5] ❌
- s7 unsupported: F5 listet Fressfeinde (wird gefressen von), nicht als 'Fressfeinde' aufgezeichnet - dies ist korrekt übersetzt, aber Formulierung passt; jedoch prüfen: alle vier Arten stehen in F5.

### Hauhechel-Bläuling · *Polyommatus icarus* · en (insect, 10 lines) · validator ✓ · 1.73 ¢ · judge ssssss · orphans 0
> The Common blue, in German Hauhechel-Bläuling, is a butterfly and belongs to the insects. [F1,F2,F3] In Mainz-Bingen there are 580 reports over ten years, with the main time from May to September. [F8] Most reports fall in September, August and July, while from November to March there are none. [F8]
>
> It has been recorded feeding on plants such as Black Medick, Tufted Vetch, Sainfoin and Oregano. [F4] Visits to flowers have been noted at Bull Thistle, Hedgerow Crane's-bill, Meadow vetchling and Bush Vetch, and it has been recorded pollinating Borage, Dog rose, Cuckoo Flower and Teasel. [F7,F6] Birds have been recorded eating it, among them the Barn swallow, Dunnock, Eurasian nuthatch and House sparrow. [F5]

### Kleiner Kohlweißling · *Pieris rapae* · de (insect, 10 lines) · validator ✓ · 2.01 ¢ · judge ssssss · orphans 0
> Der Kleine Kohlweißling ist ein Insekt aus der Ordnung der Schmetterlinge (Lepidoptera), auf Englisch Small White genannt. [F1,F2,F3] Im Landkreis Mainz-Bingen liegen 576 Meldungen aus zehn Jahren vor, mit der Hauptzeit von Juni bis September. [F7] Die meisten Meldungen fallen auf den August, während aus Januar und Februar keine vorliegen. [F7]
>
> Als Nahrung wurden unter anderem Gewöhnliche Kratzdistel, Behaartes Schaumkraut, Weg-Rauke und Scharbockskraut beobachtet. [F4] An Blüten wurde der Falter etwa an Duftveilchen, Echtem Baldrian, Gemeinem Efeu und Kanadischer Goldrute festgestellt. [F6] Umgekehrt gibt es Beobachtungen, bei denen Rauchschwalbe, Star, Kleiber und Gartenkreuzspinne den Falter gefressen haben. [F5]

### Kleiner Kohlweißling · *Pieris rapae* · en (insect, 10 lines) · validator ✓ · 1.61 ¢ · judge sspsss · orphans 0
> The Small White, in German Kleiner Kohlweißling, is an insect of the butterflies and moths (Lepidoptera). [F1,F2,F3] In Mainz-Bingen it was reported 576 times in ten years, with most reports between June and September and a peak in August. [F7] A few records fall in March and still in October and November. [F7] ⚠️
>
> It has been recorded feeding on plants such as Hedge Mustard, Hairy Bittercress, Bull Thistle and Tufted Vetch. [F4] Flower visits have been observed at Sweet Violet, English Ivy, Valerian and Meadow vetchling, among many others. [F6] It has itself been recorded as prey of Barn swallow, Common starling, Eurasian nuthatch and Cross Orbweaver. [F5]
- s3 partial: March value 7% is small but 'a few' not stated; November value equals December (3%), not clearly higher than surrounding months, and calling them notable records beyond stated percentages goes further than data.

### Ackerhummel · *Bombus pascuorum* · de (insect, 10 lines) · validator ✓ · 1.98 ¢ · judge ssssss · orphans 0
> Die Ackerhummel ist ein Insekt aus der Ordnung der Hymenoptera und gilt als nicht gefährdet. [F1,F2,F4] In Mainz-Bingen liegen 572 Meldungen aus zehn Jahren vor, mit der Hauptzeit von April bis September. [F8] Die meisten Meldungen fallen auf den August, gefolgt von Juni und Juli, während aus Januar, Februar, November und Dezember keine vorliegen. [F8]
>
> Beim Fressen wurde sie unter anderem an Gemeinem Flieder, Echtem Beinwell, Oregano und Wiesen-Flockenblume beobachtet. [F5] Als Blütenbesucherin ist sie etwa an Hain-Salbei, Rundblättriger Glockenblume, Feldahorn und Pyrenäen-Storchschnabel aufgezeichnet. [F7] Umgekehrt wurde sie als Beute von Gartenkreuzspinne, Veränderlicher Krabbenspinne, Hornisse und Bienenfresser festgehalten. [F6]

### Ackerhummel · *Bombus pascuorum* · en (insect, 10 lines) · validator ✓ · 1.57 ¢ · judge ssssss · orphans 0
> The Common Carder Bee, in German Ackerhummel, is an insect of the order Hymenoptera. [F1,F2,F3] The IUCN Red List places it in the category least concern. [F4] In Mainz-Bingen there were 572 reports over ten years, with most between April and September and the highest share in August. [F8]
>
> It has been recorded feeding on Common Comfrey, White Dead-nettle, Oregano and Bush Vetch, among more than forty plants noted. [F5] Flower visits have also been observed at Harebell, Field Maple, Balkan Clary and Wall Germander, alongside well over a hundred further plants. [F7] It has itself been recorded as prey of the Cross Orbweaver, the Goldenrod Crab Spider, the European hornet and the European bee-eater. [F6]

### Rapsweißling · *Pieris napi* · de (insect, 9 lines) · validator ✓ · 1.95 ¢ · judge ssssss · orphans 0
> Der Rapsweißling ist ein Insekt aus der Ordnung der Schmetterlinge (Lepidoptera), englisch Green-veined white. [F1,F2,F3] Im Landkreis Mainz-Bingen liegen 569 Meldungen aus zehn Jahren vor, mit der Hauptzeit von April bis September. [F7] Die meisten Meldungen fallen auf Juli, viele auch auf April, August und Juni, während aus Januar, Februar, November und Dezember keine vorliegen. [F7]
>
> Beim Fressen wurde die Art unter anderem an Behaartem Schaumkraut, Weg-Rauke, Scharbockskraut und Vogel-Wicke beobachtet. [F4] An Blüten wurde sie etwa an Gewöhnlicher Kratzdistel, Echtem Beinwell, Duftveilchen und Gemeinem Flieder festgestellt. [F6] Als Beute wurde sie unter anderem für Rauchschwalbe, Kleiber, Star und Gartenkreuzspinne nachgewiesen. [F5]

### Rapsweißling · *Pieris napi* · en (insect, 9 lines) · validator ✓ · 1.57 ¢ · judge pspsss · orphans 2
> The Green-veined white, in German Rapsweißling, is a butterfly of the order Lepidoptera and belongs to the insects and spiders group. [F1,F2,F3] ⚠️ In Mainz-Bingen there are 569 reports over ten years, with most of them between April and September. [F7] Sightings begin in March, rise steeply in April, and reach their highest point in July before falling away through September and October. [F7] ⚠️ 🟠
>
> It has been recorded feeding on Hairy Bittercress, Hedge Mustard, Lesser Celandine and Oregano, among many other plants. [F4] Flower visits have been observed at Bull Thistle, Common Comfrey, Sweet Violet and Harebell. [F6] It has also been recorded as prey of Barn swallow, Dunnock, Common starling and Cross Orbweaver. [F5]
- s1 partial: 'Insects and spiders' is GBIF's group label, but the species is only an insect (F1 says class Insecta), so claiming it belongs to an insect-and-spider group is a stretch beyond stated fact
- s3 partial: 'Begin in March' and 'falling through September and October' go beyond the monthly percentages, which show nonzero activity in March (not a start) and no explicit continuous decline described as such
- s3 🟠 Sightings begin in March · Sightings fall through September and October


## V1 · claude-haiku-4-5-20251001

### Amsel · *Turdus merula* · de (bird, 16 lines) · validator ✓ · 0.34 ¢ · judge spssss · orphans 2
> Die Amsel ist ein Vogel aus der Ordnung Passeriformes und wiegt etwa 103 g bei einer Spannweite von 36 cm. [F1,F6,F10] In Mainz-Bingen ist sie das ganze Jahr über zu beobachten, mit den meisten Meldungen von Januar bis Februar und wieder ab November. [F14] ⚠️ 🟠 Der Status ist nicht gefährdet. [F4]
>
> Sie lebt in Wald und auf dem Boden, ist tagsüber aktiv und Standvogel. [F7,F8,F11] Als Allesfresser wurde sie beim Fressen von Rotbuche, Vogelknöterich, Ranunculus ficaria, Klatschmohn und Gemeinem Flieder beobachtet. [F5,F13] Sie wird mit etwa einem Jahr geschlechtsreif und kann frei lebend bis zu 21,8 Jahre alt werden. [F12,F9]
- s2 partial: Meldungshöhe Feb/Nov ist ungenau bzw. übergeht höhere Werte im Dez; 'meisten Meldungen' verallgemeinert das Profil unzulässig.
- s2 🟠 Meiste Meldungen von Januar bis Februar · Meiste Meldungen wieder ab November

### Amsel · *Turdus merula* · en (bird, 16 lines) · validator ✓ · 0.29 ¢ · judge psss · orphans 2
> The Common blackbird is a bird of the order Passeriformes found in forests and on the ground throughout Mainz-Bingen, present in all months with peak sightings in January and December and fewest reports in July and August. [F1,F3,F7,F14] ⚠️ 🟠 It weighs around 100 g and has a wingspan of 36 cm. [F6,F10]
>
> This omnivore has been recorded eating Black Locust, Beech, Horse-chestnut, Corn poppy, Black poplar, Wood Avens, and many other plants. [F5,F13] It is active by day, does not migrate, reaches maturity at one year of age, and can live up to 21.8 years in the wild. [F8,F11,F12,F9]
- s1 partial: 'Fewest reports in July and August' is not fully accurate: July is 36, August 21, but September also 36; peak sightings claim uses only Jan (100) and Dec (95), but Dec is not the peak, Jan is; minor rounding of peak vs Dec acceptable but 'peak sightings in January and December' overstates since Dec is only 95, not co-peak, but treated as partial due to species class detail merged with order.
- s1 🟠 Peak sightings in December · Fewest reports in July

### Kleiner Feuerfalter · *Lycaena phlaeas* · de (insect, 11 lines) · validator ✓ · 0.40 ¢ · judge puss · orphans 6
> Der Kleine Feuerfalter ist ein Insekt aus der Ordnung der Schmetterlinge und in Mainz-Bingen von April bis Mai sowie Juli bis Oktober anzutreffen, wobei die meisten Beobachtungen in den September fallen. [F1,F2,F8] ⚠️
>
> Die Raupen fressen Vogelknöterich, Gewöhnliche Kreuzblume, Vogel-Wicke, Zypressen-Wolfsmilch, Weiße Fetthenne und weitere Pflanzen. [F4] ❌ 🟠 Die Falter wurden beim Besuch von Blüten der Strahlenlosen Kamille, Gewöhnlichen Kratzdistel, des Hopfenklees, des Scharbocksrauts und zahlreicher weiterer Pflanzen beobachtet und bestäuben dabei unter anderem Ringelblume, Gemeinen Efeu und Kanadische Goldrute. [F7,F6] Rauchschwalbe, Saatkrähe, Kernbeißer, Mauersegler, Kleiber und Star erbeuten den Falter. [F5]
- s1 partial: Raupenfutterpflanzen aus F4 werden fälschlich der Art als 'Insekt' zugeschrieben korrekt, aber September-Spitze ist zusätzliche Interpretation des Monatsprofils, nicht explizit als 'meiste Beobachtungen' benannt (nur Prozentwert 100).
- s2 unsupported: F4 nennt Fraß der Art allgemein, nicht spezifisch der Raupen.
- s2 🟠 Raupen fressen Vogelknöterich · Raupen fressen Gewöhnliche Kreuzblume · Raupen fressen Vogel-Wicke · Raupen fressen Zypressen-Wolfsmilch · Raupen fressen Weiße Fetthenne · Raupen fressen weitere Pflanzen

### Kleiner Feuerfalter · *Lycaena phlaeas* · en (insect, 11 lines) · validator ✓ · 0.33 ¢ · judge uspp · orphans 4
> The Small Copper is a butterfly of the region, present from April to May and again from July to October, with peak sightings in September. [F3,F8] ❌ It belongs to the Lepidoptera, the order of insects that includes all butterflies and moths. [F1] 🟠
>
> The caterpillar has been recorded feeding on Sorrel, Tufted Vetch, Cypress Spurge, Common Milkwort and White Stonecrop, among many other plants. [F4] ⚠️ 🟠 Adults visit flowers of Bull Thistle, Black Medick, Tufted Vetch, Ranunculus ficaria and Pot Marigold, and have been observed as prey of Barn swallows, Rooks, Common swifts, Starlings and numerous other birds. [F7,F5] ⚠️ 🟠
- s1 unsupported: F3 gives no phenology data and does not say 'butterfly of the region'; species is a butterfly but that comes from F1, not F3; peak month claim uses F8 correctly but overall citation mismatched, and 'butterfly' claim uncited here.
- s2 🟠 Lepidoptera includes all butterflies and moths
- s3 partial: 'Caterpillar' feeding stage is not stated; F4 only says it eats these plants, not the caterpillar specifically.
- s3 🟠 Caterpillar feeds on Sorrel
- s4 partial: 'Adults' visiting flowers is not stated in F7; species-level claim generalized to life stage.
- s4 🟠 Adults visit flowers of Bull Thistle · It visits flowers of Pot Marigold

### Fliegenpilz · *Amanita muscaria* · de (fungus, 10 lines) · validator ✓ · 0.28 ¢ · judge ssus · orphans 1
> Der Fliegenpilz ist ein Pilz aus der Klasse Agaricomycetes. In Mainz-Bingen wurden in zehn Jahren 19 Meldungen registriert, hauptsächlich im Oktober und November, mit Nachweise auch im September und März. [F1,F2,F8] Das Sporenpulver ist weiß; der Pilz ist giftig und psychoaktiv. [F5,F4]
>
> Der Fliegenpilz wurde beim Fressen durch Waldmistkäfer, Tigerschnegel und Sciurus niger beobachtet. [F6] ❌ 🟠 Er beherbergt Pilze wie Hypomyces und Chalciporus piperatus. [F7]
- s3 unsupported: F6 nennt Fressbeziehung, nicht 'beobachtet'; zudem impliziert Formulierung direkte Beobachtung, die nicht belegt ist.
- s3 🟠 Fressen wurde beobachtet

### Fliegenpilz · *Amanita muscaria* · en (fungus, 10 lines) · validator ✓ · 0.26 ¢ · judge sssus · orphans 1
> Fly Agaric is a fungus in the class Agaricomycetes that appears in Mainz-Bingen mainly from October to November. [F1,F3,F8] It is poisonous and psychoactive. [F4]
>
> It has been recorded eaten by Waldmistkäfer, Great Grey Slug, and Mesarion. [F6] Hypomyces and Cladosporium epimyces have been recorded on it, and it hosts Chalciporus piperatus. [F7] ❌ 🟠 It bears a white spore print. [F5]
- s4 unsupported: 'hosts Chalciporus piperatus' inverts the relation; F7 states it is host of these, not that it hosts them in the reverse sense claimed.
- s4 🟠 it hosts Chalciporus piperatus

### Feuersalamander · *Salamandra salamandra* · de (amphibian, 13 lines) · validator ✓ · 0.34 ¢ · judge sssus · orphans 0
> Der Feuersalamander ist eine Amphibie, die in Mainz-Bingen vor allem von März bis Mai und von August bis Dezember anzutreffen ist. [F1,F2,F12] Er wird etwa 28 cm lang und wiegt durchschnittlich 36 g. [F7,F6] Die Art ist gefährdet und lebt an Land, im Wasser und im Boden. [F4,F8]
>
> Der Feuersalamander ist tag- und nachtaktiv und wurde beim Fressen von Schwarzem Schnegel, Italienischer Schönschrecke, Mistbiene und Tigerschnegel beobachtet; er frisst Gliederfüßer. [F9,F10,F5] ❌ Er wird von Kranich, Kleinem Wasserfrosch, Hauskatze, Wildschwein, Eichelhäher, Stockente und Barrenringelnatter erbeutet. [F11]
- s4 unsupported: 'beobachtet' ist eine unbelegte Interpretation von 'frisst'; GloBI listet Fressbeziehungen, kein Beobachtungsereignis.

### Feuersalamander · *Salamandra salamandra* · en (amphibian, 13 lines) · validator ✓ · 0.29 ¢ · judge ps · orphans 1
> The Fire salamander is an amphibian [F1, F3] reaching 28 cm in length [F7] with a mass of 36 g [F6]. In Mainz-Bingen it is most often reported in October, with significant numbers also appearing from March to May and from August to December [F12]. Its status is vulnerable [F4]. [F1,F3,F7,F6,F12,F4] ⚠️ 🟠
>
> It lives on land, in water and underground [F8], active by day, at dusk and dawn, and at night [F9]. It feeds on arthropods [F5], including Ash-black Slug, Italienische Schönschrecke, Blue Carpenter Bee and Drone Fly [F10]. It has been recorded as prey of Common crane, Pool frog, Domestic Cat, Wild boar, Eurasian jay and Mallard [F11]. [F8,F9,F5,F10,F11]
- s1 partial: Peak month claim for Mainz-Bingen goes beyond F12's aggregate main-time statement; F12 doesn't single out October as most-often reported vs the listed main time.
- s1 🟠 In Mainz-Bingen it is most often reported in October

### Große Brennnessel · *Urtica dioica* · de (plant, 14 lines) · validator ✓ · 0.34 ¢ · judge sssup · orphans 4
> Die Große Brennnessel ist eine Staude, die bis 3 m hoch wird und in Mainz-Bingen vor allem von April bis Juli anzutreffen ist. [F2,F5,F6,F12] Sie ist nicht gefährdet und blüht von Mai bis Oktober. [F4,F7]
>
> Die Blüten werden vom Wind bestäubt. [F8] Sie wird von Siebenpunkt-Marienkäfer, Kleiner Fuchs, Tagpfauenauge und Rötelmaus gefressen. [F10] ❌ Kleiner Fuchs und Tagpfauenauge nutzen sie als Futterpflanze für ihre Raupen, ebenso Brauner Bär und Landkärtchen. [F11] ⚠️ 🟠
- s4 unsupported: Raupen der Falter fressen die Pflanze laut F10, nicht 'gefressen werden' im Sinne von Fressfeinden der Pflanze selbst ist korrekt, aber Rötelmaus ist in F10 als Fresser gelistet - das stimmt; jedoch die Formulierung impliziert nichts Falsches direkt, prüfen: alle vier Arten sind in F10 gelistet.
- s5 partial: F11 nennt nur 'Wirt von', nicht explizit 'Futterpflanze für Raupen'.
- s5 🟠 Kleiner Fuchs nutzt sie als Futterpflanze für Raupen · Tagpfauenauge nutzt sie als Futterpflanze für Raupen · Brauner Bär nutzt sie als Futterpflanze für Raupen · Landkärtchen nutzt sie als Futterpflanze für Raupen

### Große Brennnessel · *Urtica dioica* · en (plant, 14 lines) · validator ✓ · 0.29 ¢ · judge ssss · orphans 0
> The Stinging Nettle is a perennial herb that grows up to 3 m tall. [F3,F6,F5] In Mainz-Bingen it is most often recorded from April to July, with peak reports in May. [F12]
>
> It flowers from May to October and is pollinated by wind. [F7,F8] The plant hosts caterpillars of the Small tortoiseshell, Peacock, Garden tiger moth and Map butterfly, and has been recorded eaten by Sevenspotted Lady Beetle, Bank vole, 2-spot Ladybird and Chrysomela polita. [F11,F10]

### Nosferatu-Spinne · *Zoropsis spinimana* · de (insect, 6 lines) · validator ✓ · 0.19 ¢ · judge ss · orphans 0
> Die Nosferatu-Spinne ist eine Spinne aus der Klasse Arachnida. In Mainz-Bingen wird sie regelmäßig beobachtet, mit Schwerpunkt von August bis November; September ist der Monat mit den meisten Meldungen. [F1,F2,F5]
>
> Sie wurde beim Fressen von anderen Spinnen und Schmetterlingen beobachtet. [F4]

### Nosferatu-Spinne · *Zoropsis spinimana* · en (insect, 6 lines) · validator ✓ · 0.17 ¢ · judge ss · orphans 0
> The Zoropsid spider is a spider found in Mainz-Bingen, where reports peak from August to November, with September as the month of most frequent sightings. [F1,F3,F5]
>
> It has been recorded eating spiders and lepidopterans. [F4]

### Kranich · *Grus grus* · de (bird, 15 lines) · validator ✓ · 0.33 ¢ · judge ssssps · orphans 0
> Der Kranich ist ein Vogel aus der Ordnung Gruiformes und wiegt etwa 5,5 kg bei einer Spannweite von 2,2 m. [F1,F6,F10] In Mainz-Bingen wird er hauptsächlich im Februar und von Oktober bis Dezember beobachtet, wobei Februar die meisten Meldungen aufweist. [F14] Er ist nicht gefährdet und steht auf der Roten Liste als LC. [F4]
>
> Der Kranich ist ein Zugvogel, der tagsüber aktiv ist und Feuchtgebiete bewohnt. [F11,F8,F7] Als Allesfresser wurde er beim Fressen von Grasfröschen, Alpenstrandläufern, Bluthänflingen und Kleinen Wasserfröschen beobachtet. [F5,F12] ⚠️ In der Natur kann er bis zu 43 Jahre alt werden. [F9]
- s5 partial: 'beobachtet' und Auswahl von vier Arten aus 12+ als Beispiel suggeriert; Allesfresser-Zuordnung korrekt, aber Fressverhalten ist Beleg aus GloBI, nicht 'beobachtet' im Sinne von direkter Beobachtung genannt.

### Kranich · *Grus grus* · en (bird, 15 lines) · validator ✓ · 0.27 ¢ · judge ssss · orphans 0
> Common cranes are migratory birds of the wetland, with a wingspan of 2.2 m and a mass of 5.5 kg. [F3,F7,F10,F6,F11] In Mainz-Bingen, they appear mainly from October to December and in February. [F14]
>
> They are active by day and feed on Common frogs, Pool frogs, Common toads, Natterjack toads, Smooth newts, Fire salamanders, Common slow worms, Sand lizards, and various birds including Dunlins, Eurasian curlews, and Common reed buntings. [F8,F12] In the wild they can live up to 43 years, and their status is least concern. [F9,F4]

### Hirschkäfer · *Lucanus cervus* · de (insect, 8 lines) · validator ✓ · 0.27 ¢ · judge spsup · orphans 2
> Der Hirschkäfer ist ein Insekt aus der Ordnung der Käfer. [F1,F2] In Mainz-Bingen wird er hauptsächlich von Juni bis Juli beobachtet, mit Schwerpunkt im Juni. [F7] ⚠️ Er steht auf der Roten Liste nicht auf der Gefährdungsliste. [F4]
>
> Der Käfer wurde beim Fressen von Rotbuche, Vogelkirsche, Gemeiner Esche, Stieleiche und Schlehdorn beobachtet. [F5] ❌ 🟠 Turmfalke und andere Vögel stellen ihm nach. [F6] ⚠️ 🟠
- s2 partial: Schwerpunkt Juni ist zusätzliche Interpretation, nicht explizit als 'Schwerpunkt' benannt, aber aus Monatsprofil ableitbar; Hauptzeit korrekt zitiert
- s4 unsupported: GloBI-Daten sind keine direkten Beobachtungen, 'beobachtet' ist eine unbelegte Zusatzbehauptung
- s4 🟠 Käfer wurde dabei beobachtet
- s5 partial: 'stellen ihm nach' impliziert aktives Jagen, F6 belegt nur Fressbeziehung; 'andere Vögel' generalisiert aus einzelnen Arten
- s5 🟠 Sie stellen ihm aktiv nach

### Hirschkäfer · *Lucanus cervus* · en (insect, 8 lines) · validator ✓ · 0.22 ¢ · judge ssps · orphans 0
> The Stag Beetle is a beetle found in Mainz-Bingen, where it appears mainly from June to July. [F1,F3,F7] It has least concern status. [F4]
>
> The beetle has been recorded eating Beech, Sweet Cherry, European ash, Pedunculate Oak, and Blackthorn. [F5] ⚠️ It is preyed upon by the Common kestrel. [F6]
- s3 partial: omits that many more items are eaten, but each listed item is supported; the selective list implies these are the only/main foods, going slightly beyond the record's 'and 27 more'

### Grasfrosch · *Rana temporaria* · de (amphibian, 15 lines) · validator ✓ · 0.34 ¢ · judge ssus · orphans 1
> Der Grasfrosch ist eine Amphibie mit einer Länge von etwa 11 cm und einem Gewicht von etwa 48 g. [F1,F2,F7,F6] In Mainz-Bingen sind die Meldungen zwischen Februar und April am häufigsten, mit dem Höchststand im März. [F13]
>
> Der Frosch lebt an Land und im Wasser, ist tagsüber und nachts aktiv und ernährt sich von Gliederfüßern; er wurde beim Fressen von Schnecken, Insekten aus den Ordnungen Trichoptera und Calliphoridae, Fadenwürmern und Regenwürmern beobachtet. [F8,F9,F5,F10] ❌ 🟠 Zu seinen natürlichen Feinden gehören Rotfuchs, Saatkrähe, Kranich, Weißstorch, Star, Rabenkrähe, Turmfalke und viele weitere Arten. [F11]
- s3 unsupported: Fadenwürmer sind Parasit, nicht als gefressen belegt; Salamandrella keyserlingii fehlt und Fliegenarten wurden verallgemeinert
- s3 🟠 Frosch frisst Fadenwürmer

### Grasfrosch · *Rana temporaria* · en (amphibian, 15 lines) · validator ✓ · 0.29 ¢ · judge ssss · orphans 0
> The Common frog is an amphibian found in Mainz-Bingen, where it is most often reported from February to April, with peak records in March. [F1,F3,F13] It reaches about 11 cm in length and 48 g in mass, and is classified as least concern. [F6,F7,F4]
>
> It lives on land, in water, and in trees, active by day and at night, feeding on arthropods including White-lipped snails, Trichoptera, Lumbricidae, and Calliphoridae. [F8,F9,F5,F10] It is hunted by Red foxes, Rooks, White storks, Common starlings, Common kestrels, and many other predators. [F11]

### Schwarz-Erle · *Alnus glutinosa* · de (plant, 12 lines) · validator ✓ · 0.36 ¢ · judge pssus · orphans 3
> Die Schwarz-Erle ist ein Baum oder Strauch, der bis 25 m hoch wird und in Mainz-Bingen das ganze Jahr über anzutreffen ist, mit Häufungsphasen im Dezember und Mai. [F5,F6,F11] ⚠️ 🟠 Sie ist nicht gefährdet. [F4]
>
> Im April blüht die Art durch Windbestäubung. [F7,F8] Ihre Samen und Blätter werden von Vögeln wie Saatkrähe, Bluthänfling, Kleiber und Star sowie von Halsbandsittich gefressen; auch Insekten wie Moschusbock, Echter Widderbock, Brauner Bär und Pappelschwärmer wurden beim Fressen beobachtet. [F9] ❌ 🟠 Sie ist Wirt für Pilze wie Schmetterlings-Tramete und Gemeinen Schwefelporling, Flechten wie Furchen-Schüsselflechte sowie für Insekten wie Schneespanner, Lindenschwärmer und Buchen-Streckfuß. [F10]
- s1 partial: Mai ist nicht die zweithöchste Häufung, nur Dez ist stark hervorgehoben; Mai-Wert (31%) ist nicht klar eine 'Häufungsphase' im Vergleich zu anderen Monaten
- s1 🟠 Häufungsphase im Mai
- s4 unsupported: F9 nennt nur 'wird gefressen von', keine Angabe zu Samen/Blättern als Nahrungsteil
- s4 🟠 Samen werden gefressen · Blätter werden gefressen

### Schwarz-Erle · *Alnus glutinosa* · en (plant, 12 lines) · validator ✓ · 0.28 ¢ · judge ssss · orphans 0
> Black Alder is a tree or shrub reaching up to 25 m, found year-round in Mainz-Bingen. [F3,F5,F6,F11] It is rated least concern. [F4]
>
> The tree flowers in April and is wind-pollinated. [F7,F8] It has been recorded as food for Rose-ringed parakeet, Rook, Common linnet, Eurasian nuthatch, Common starling and Dunnock, and hosts moths including Pale Brindled Beauty, Lime Hawk-Moth and Pale Tussock, as well as fungi such as Turkeytail and Chicken Of The Woods. [F9,F10]

### Dunkle Erdhummel · *Bombus terrestris* · de (insect, 9 lines) · validator ✓ · 0.33 ¢ · judge ppss · orphans 2
> Die Dunkle Erdhummel ist ein Insekt aus der Ordnung Hymenoptera und gehört zur Gruppe der Hummeln. [F1,F2] ⚠️ 🟠 In Mainz-Bingen ist sie von Februar bis September anzutreffen, mit Schwerpunkt von Juni bis August. [F7] ⚠️ 🟠
>
> Sie wurde beim Fressen von Kulturapfel, Borretsch, Möhre, Rotem Fingerhut, Schmuckkörbchen und weiteren Pflanzen beobachtet und besucht Blüten von Robinie, Rosskastanie, Klatschmohn, Flieder und über 170 anderen Arten. [F4,F6] Die Art wird von Gartenkreuzspinne, Krabbenspinnen, Hornisse, Asiatischer Hornisse und Bienenfresser erbeutet. [F5]
- s1 partial: Zugehörigkeit zur Gruppe der Hummeln wird durch F1 (nur 'Insekt oder Spinne') nicht belegt, ebenso der wissenschaftliche Rang/Art als Insekt ist ok, aber 'Hummeln' ist nicht explizit gestützt.
- s1 🟠 Sie gehört zur Gruppe der Hummeln
- s2 partial: Hauptzeit laut F7 ist Feb–Sep, aber der genannte Schwerpunkt Juni–August ist nicht exakt so angegeben (F7 nennt keine Schwerpunktspanne, nur Monatsprofil-Werte).
- s2 🟠 Der Schwerpunkt liegt von Juni bis August

### Dunkle Erdhummel · *Bombus terrestris* · en (insect, 9 lines) · validator ✓ · 0.30 ¢ · judge spss · orphans 1
> The Buff-tailed Bumblebee is an insect of the order Hymenoptera found in Mainz-Bingen from February to September, with peak activity in July. [F1,F3,F7] Reports peak in June and July, dropping sharply after August. [F7] ⚠️ 🟠
>
> It has been recorded feeding on Apple, Borage, Queen Anne's Lace, Foxglove, Garden cosmos, Phacelia, Common Ragwort, and Spotted Dead-nettle, and visits flowers of Black Locust, Black Medick, Horse-chestnut, Common Lilac, and many others. [F4,F6] Predators include Cross Orbweaver, Goldenrod Crab Spider, European hornet, European bee-eater, and Asian hornet. [F5]
- s2 partial: 'dropping sharply' after August is an added interpretation not directly stated
- s2 🟠 Reports drop sharply after August

### Schachbrett · *Melanargia galathea* · de (insect, 9 lines) · validator ✓ · 0.37 ¢ · judge sspp · orphans 1
> Das Schachbrett ist ein Schmetterling aus der Ordnung Lepidoptera, der in Mainz-Bingen vor allem in den Monaten Juni und Juli anzutreffen ist. [F1,F2,F8] 644 Meldungen aus der Region zeigen eine klare Schwerpunktzeit im Juni, während die Häufigkeit im Juli auf etwa 63 Prozent sinkt. [F8]
>
> Der Falter wurde beim Besuch von Blüten der Skabiosen-Flockenblume, des Oregano, des Mittleren Klees, der Rundblättrigen Glockenblume und des Echten Baldrians beobachtet. [F7] ⚠️ 🟠 Es bestäubt dabei unter anderem Skabiosen-Flockenblume, Oregano und Mittleren Klee; Rauchschwalbe, Saatkrähe, Mauersegler, Star und Kleiber wurden beim Fressen dieses Schmetterlings beobachtet. [F6,F5] ⚠️
- s3 partial: Skabiosen-Flockenblume und Echter Baldrian nicht eindeutig in F7 als Blütenbesuch belegt bzw. teils nur in anderen Fakten genannt.
- s3 🟠 Falter besucht Blüten der Skabiosen-Flockenblume
- s4 partial: Skabiosen-Flockenblume als bestäubte Pflanze korrekt, aber Kleiber ist in F5 nicht als Fresser genannt (er ist ohnehin unplausibel als Schmetterlingsfresser, aber laut Liste nicht ausgeschlossen) - jedoch geprüft: Kleiber steht tatsächlich in F5.

### Schachbrett · *Melanargia galathea* · en (insect, 9 lines) · validator ✓ · 0.36 ¢ · judge ssuus · orphans 9
> The Marbled White is a butterfly of the order Lepidoptera found in Mainz-Bingen, where it appears from June to July with peak reports in June [F1, F3, F8]. [F1,F3,F8] It has been recorded visiting flowers of Harebell, Bull Thistle, Oregano, Valerian, Carline Thistle, zigzag clover, and Greater Knapweed [F7]. [F7]
>
> The caterpillar feeds on Timothy, Cock's-Foot, Harebell, Meadow vetchling, and other grasses and herbs [F4]. [F4] ❌ 🟠 Adults have been recorded eating Disc Mayweed, Common Hemp-Nettle, White Stonecrop, and Oregano, and pollinate Greater Knapweed, Oregano, zigzag clover, and Carline Thistle [F4, F6]. [F4,F6] ❌ 🟠 Barn swallows, Rooks, Eurasian nuthatches, Dunnocks, Common starlings, and Common cuckoos have been recorded eating this butterfly [F5]. [F5]
- s3 unsupported: F4 does not distinguish caterpillar vs adult diet; 'grasses and herbs' generalization not stated.
- s3 🟠 Caterpillar feeds on Timothy · Caterpillar feeds on Cock's-Foot · Caterpillar feeds on Harebell · Caterpillar feeds on Meadow vetchling · Feeds on other grasses and herbs
- s4 unsupported: F4 lists general eating, not specifically adults; caterpillar/adult distinction not in facts.
- s4 🟠 Adults eat Disc Mayweed · Adults eat Common Hemp-Nettle · Adults eat White Stonecrop · Adults eat Oregano

### Europäische Gottesanbeterin · *Mantis religiosa* · de (insect, 8 lines) · validator ✓ · 0.29 ¢ · judge ssss · orphans 0
> Die Europäische Gottesanbeterin ist ein Insekt aus der Ordnung Mantodea und in Mainz-Bingen von August bis September am häufigsten anzutreffen, mit Schwerpunkt im September. [F1,F2,F7] Der Status der Art ist nicht gefährdet. [F4]
>
> Sie wurde beim Fressen von Grashüpfern wie dem Weißrandigen Grashüpfer und dem Braunen Grashüpfer sowie von Wespen und dem Grünen Heupferd beobachtet. [F5] Saatkrähe, Weißstorch, Fasan, Rabenkrähe und Turmfalke gehören zu ihren Prädatoren. [F6]

### Europäische Gottesanbeterin · *Mantis religiosa* · en (insect, 8 lines) · validator ✓ · 0.27 ¢ · judge susu · orphans 3
> The European mantis is an insect of the order Mantodea, ranked as least concern on the IUCN Red List. [F1,F3,F4] In Mainz-Bingen, it appears from July to November, with peak reports in August and September. [F7] ❌ 🟠
>
> It has been recorded eating grasshoppers including the Lesser Marsh Grasshopper, Common field grasshopper, Great Green Bush-cricket, and wasps such as the European paper wasp and German Wasp. [F5] It is preyed upon by birds including the Rook, White stork, Common pheasant, Carrion crow, Common kestrel, and House sparrow, and also by the Great Green Bush-cricket and German Wasp. [F6] ❌ 🟠
- s2 unsupported: Main time is Aug–Sep, not July–November; peak months misstated
- s2 🟠 Appears from July to November in Mainz-Bingen
- s4 unsupported: Great Green Bush-cricket and German Wasp are prey items it eats, not predators of it
- s4 🟠 It is eaten by Great Green Bush-cricket · It is eaten by German Wasp

### Tagpfauenauge · *Aglais io* · de (insect, 10 lines) · validator ✓ · 0.35 ¢ · judge psss · orphans 1
> Das Tagpfauenauge ist ein Insekt aus der Ordnung der Schmetterlinge und in Mainz-Bingen von März bis Juli häufig anzutreffen, mit weiteren Beobachtungen im September. [F1,F2,F8] ⚠️ 🟠 In der Region wurden über zehn Jahre hinweg 625 Meldungen registriert. [F8]
>
> Es wurde beim Fressen von Ranunkeln, Distel, Vogel-Wicke, Baldrian und Storchschnabel beobachtet und bestäubt unter anderem Veilchen, Baldrian und Klee. [F4,F6] Rauchschwalbe, Saatkrähe, Mauersegler, Kleiber, Star und Rabenkrähe zählen zu seinen Fressfeinden. [F5]
- s1 partial: 'häufig' und die Zusammenfassung 'März bis Juli' plus 'weitere Beobachtungen im September' sind eine unbelegte Interpretation des Monatsprofils, das auch andere Monate mit Vorkommen zeigt
- s1 🟠 In Mainz-Bingen von März bis Juli häufig

### Tagpfauenauge · *Aglais io* · en (insect, 10 lines) · validator ✓ · 0.34 ¢ · judge psss · orphans 0
> The Peacock is a butterfly found in Mainz-Bingen, where it appears most often from March to April, in June and July, and again in September. [F3,F8] ⚠️ It has been recorded visiting flowers of Bull Thistle, Ranunculus ficaria, Sweet Violet, Common Comfrey, Tufted Vetch, Plumeless thistle, Apple, and Lesser Celandine, among many others. [F7]
>
> The species feeds on Ranunculus ficaria, Wood Avens, Plumeless thistle, Tufted Vetch, Glandular Globe-thistle, and Devil's-Bit Scabious, as well as many further plants. [F4] It is eaten by Barn swallows, Rooks, Hawfinches, Common swifts, Eurasian nuthatches, Dunnocks, Common starlings, Common pheasants, and Common cuckoos, among others. [F5]
- s1 partial: 'Butterfly' is not stated in cited lines (only class/order in F1); F8 supports timing.

### Admiral · *Vanessa atalanta* · de (insect, 11 lines) · validator ✓ · 0.34 ¢ · judge psus · orphans 1
> Der Admiral ist ein Schmetterling und in Mainz-Bingen von Februar bis Oktober anzutreffen, mit Schwerpunkt in den Monaten Juni bis Oktober. [F1,F2,F9] ⚠️ 🟠 Die Art ist nicht gefährdet. [F4]
>
> Er wurde beim Fressen von Kratzdistel, Distel, Flieder, Apfel und Efeu beobachtet und bestäubt dabei Apfel, Margerite, Gänseblümchen und viele weitere Blütenpflanzen. [F5,F7] ❌ Rauchschwalbe, Saatkrähe, Kernbeißer, Mauersegler und Gartenkreuzspinne sind unter seinen Fressfeinden verzeichnet. [F6]
- s1 partial: Hauptzeit laut F9 ist 'Feb–Apr · Jun–Okt', nicht 'Juni bis Oktober' als Schwerpunkt; Text lässt Feb-Apr-Schwerpunkt weg und verfälscht damit die Angabe.
- s1 🟠 Schwerpunkt in den Monaten Juni bis Oktober
- s3 unsupported: F5 belegt Fressen von Pflanzen, nicht 'beobachtet werden beim Fressen'; 'Efeu' wird laut F5 gefressen, aber die Formulierung 'beim Fressen ... beobachtet' impliziert eine Beobachtung, die nicht belegt ist; zudem ist 'Distel' als Kratzdistel bereits genannt, Doppelnennung als getrennte Art ist unbelegt.

### Admiral · *Vanessa atalanta* · en (insect, 11 lines) · validator ✓ · 0.34 ¢ · judge pssps · orphans 1
> The Red Admiral is a butterfly found in Mainz-Bingen from February to October, with peak numbers in July and August. [F3,F9] ⚠️ It is not threatened. [F4]
>
> It has been recorded eating Black Locust, Bull Thistle, Common Lilac, Apple, Devil's-Bit Scabious, English Ivy and Alfalfa. [F5] It visits flowers of thistles, Hedgerow Crane's-bill, honeysuckle, Apple, Dogwood and Oregano, and has been recorded pollinating Apple, Sweet Cherry, Oxeye Daisy and Daisy. [F7,F8] ⚠️ 🟠 Barn swallows, Rooks, Common swifts, Common starlings, Dunnocks, Carrion crows and Cross Orbweavers have been recorded preying on it. [F6]
- s1 partial: Butterfly not stated in F3/F9; peak months July/August correct but classification as butterfly unsupported here
- s4 partial: Thistles generalizes specific species from F8; rest supported
- s4 🟠 Visits flowers of thistles

### Westliche Honigbiene · *Apis mellifera* · de (insect, 11 lines) · validator ✓ · 0.36 ¢ · judge pussu · orphans 1
> Die Westliche Honigbiene ist ein Insekt aus der Ordnung Hymenoptera und gehört zu den Insekten oder Spinnen. [F1,F2] ⚠️ In Mainz-Bingen wird die Art von Februar bis Oktober beobachtet, mit Schwerpunkt in den Monaten Juni und August. [F8] ❌ 🟠
>
> Sie wurde beim Fressen von Gewöhnlicher Robinie, Kratzdistel, Hopfenklee, Rosskastanie, Flieder und Beinwell beobachtet. [F5] Als Blütenbesucher nutzt sie Vogelknöterich, Storchschnabel, Wolfsmilch, Beinwell, Kamille und Glockenblume. [F7] Bienenwolf, Gartenkreuzspinne, Wespe und Hornisse werden als ihre Fressfeinde registriert. [F6] ❌
- s1 partial: Klasse Insecta ist korrekt, aber 'Insekten oder Spinnen' ist nur eine Gruppenkategorie, keine zweite Zugehörigkeit; Übersetzung leicht ungenau formuliert.
- s2 unsupported: Schwerpunktmonate sind Juni und August laut Monatsprofil (beide 100%), aber Hauptzeit laut F8 ist 'Feb–Okt', nicht 'Juni und August' als Schwerpunkt explizit benannt - dies ist eine Interpretation, die zwar durch die Zahlen plausibel ist, aber nicht direkt als 'Schwerpunkt' in F8 steht.
- s2 🟠 Schwerpunkt in Juni und August
- s5 unsupported: F6 listet diese Arten als 'wird gefressen von', was Fressfeinde bedeutet, aber die Bezeichnung 'Fressfeinde' impliziert eine bewertende Kategorisierung, die über die reine Auflistung hinausgeht; zudem ist 'Wespe' ungenau, da F6 'Deutsche Wespe' spezifisch nennt.

### Westliche Honigbiene · *Apis mellifera* · en (insect, 11 lines) · validator ✓ · 0.32 ¢ · judge sssp · orphans 1
> The Western honey bee is an insect of the order Hymenoptera found in Mainz-Bingen from February to October, with peak reports in June and August. [F1,F3,F8] Its conservation status is data deficient. [F4]
>
> It has been recorded feeding on Black Locust, Bull Thistle, Black Medick, Horse-chestnut, Common Lilac, Common Comfrey, Balkan Clary, Wall Germander, Harebell, Plumeless Thistle, Apple, and White Stonecrop, among many others. [F5] It is preyed upon by the European beewolf, Cross Orbweaver, Eurasian blackcap, Great Green Bush-cricket, European mantis, German Wasp, European hornet, and various crab spiders. [F6] ⚠️ 🟠
- s4 partial: 'various crab spiders' generalizes multiple distinct species not stated as a group
- s4 🟠 Preyed upon by various crab spiders

### Hauhechel-Bläuling · *Polyommatus icarus* · de (insect, 10 lines) · validator ✓ · 0.38 ¢ · judge spsss · orphans 1
> Der Hauhechel-Bläuling ist ein Insekt aus der Ordnung der Schmetterlinge [F1, F2]. [F1,F2] In Mainz-Bingen tritt er von Mai bis September auf, mit Schwerpunkt im August und September [F8]. [F8] ⚠️ 🟠
>
> Die Art wurde beim Fressen von Hopfenklee, Vogel-Wicke, Oregano, Luzerne und vielen anderen Pflanzen beobachtet [F4]. [F4] Sie besucht Blüten von Kratzdistel, Hain-Salbei, Wiesen-Platterbse, Scharbockskraut und über 90 weiteren Blütenpflanzen [F7]. [F7] Rauchschwalbe, Saatkrähe, Mauersegler, Kleiber und Star gehören zu den Arten, die diesen Schmetterling erbeuten [F5]. [F5]
- s2 partial: Schwerpunkt August/September ist nicht explizit als solcher genannt, sondern aus Monatsprofil abgeleitet
- s2 🟠 Schwerpunkt im August und September

### Hauhechel-Bläuling · *Polyommatus icarus* · en (insect, 10 lines) · validator ✓ · 0.31 ¢ · judge psuu · orphans 12
> The Common blue is a butterfly of the order Lepidoptera found in the Mainz-Bingen region from May to September, with peak sightings in August and September. [F1,F3,F8] ⚠️ 🟠 It has been recorded visiting flowers of Bull Thistle, Black Medick, Tufted Vetch, rampion bellflower, and many others. [F7]
>
> The caterpillar feeds on Black Medick, Tufted Vetch, Sainfoin, Alfalfa, and other plants. [F4] ❌ 🟠 Adults are eaten by Barn swallows, Rooks, Hawfinches, Common swifts, and various other birds. [F5] ❌ 🟠
- s1 partial: Peak month is September (100%), August is 98% not clearly a tied peak; also claims August as peak is not directly stated, and 'butterfly' beyond order Lepidoptera is inferred, not stated.
- s1 🟠 It is a butterfly · Peak sightings in August
- s3 unsupported: F4 lists what the species eats, not specifically the caterpillar stage; this life-stage detail is not stated.
- s3 🟠 The caterpillar feeds on Black Medick · The caterpillar feeds on Tufted Vetch · The caterpillar feeds on Sainfoin · The caterpillar feeds on Alfalfa · The caterpillar feeds on other plants
- s4 unsupported: F5 does not specify that it is the adult stage that is eaten; this life-stage detail is not stated.
- s4 🟠 Adults are eaten by Barn swallows · Adults are eaten by Rooks · Adults are eaten by Hawfinches · Adults are eaten by Common swifts · Adults are eaten by various other birds

### Kleiner Kohlweißling · *Pieris rapae* · de (insect, 10 lines) · validator ✓ · 0.36 ¢ · judge spsss · orphans 0
> Der Kleine Kohlweißling ist ein Insekt aus der Ordnung der Schmetterlinge. [F1,F2] In Mainz-Bingen zeigt sich dieser Schmetterling von Juni bis September, mit Häufungspunkt im August. [F7] ⚠️
>
> Die Art wurde beim Fressen von Behaartem Schaumkraut, Weg-Rauke, Zaun-Wicke und vielen weiteren Wildkräutern beobachtet. [F4] Sie besucht Blüten wie die des Duftveilchens, des Echten Baldrians, der Wiesen-Platterbse und anderer Blütenpflanzen. [F6] Rauchschwalbe, Saatkrähe, Mauersegler, Star und weitere Vögel sowie die Gartenkreuzspinne erbeuten diese Schmetterlinge. [F5]
- s2 partial: 'Häufungspunkt im August' geht über das reine Monatsprofil hinaus, das nur relative Werte nennt, ohne 'Häufungspunkt' explizit zu benennen; grenzwertig, aber Hauptzeit ist belegt.

### Kleiner Kohlweißling · *Pieris rapae* · en (insect, 10 lines) · validator ✓ · 0.31 ¢ · judge pssp · orphans 1
> The Small White is a butterfly of the order Lepidoptera found in Mainz-Bingen from March to November, with most sightings from June to September. [F1,F3,F7] ⚠️ 🟠 Peak numbers occur in August, when the species is recorded most frequently in the region. [F7]
>
> The species has been recorded eating Bull Thistle, Hairy Bittercress, Hedge Mustard, Austrian Yellow-Cress and Bush Vetch, and visits flowers of Sweet Violet, Yellow-Rattle, European honeysuckle, Meadow vetchling and Valerian. [F4,F6] It is hunted by Barn swallow, Rook, Common swift, Dunnock, European paper wasp, Common starling and Cross Orbweaver. [F5] ⚠️
- s1 partial: Months with 0% (Jan/Feb) excluded but Nov=3% and Mar=7% still nonzero, so claiming activity 'from March to November' goes beyond the stated main time of Jun–Sep; also butterfly claim not in F1 (only Insecta/Lepidoptera order, not 'butterfly' explicitly, but treated as class-level synonym - kept as supported since order is Lepidoptera).
- s1 🟠 Found in Mainz-Bingen from March to November
- s4 partial: 'Hunted by' implies predation, but F5 lists being eaten by, which includes parasitism (wasp) not necessarily hunting.

### Ackerhummel · *Bombus pascuorum* · de (insect, 10 lines) · validator ✓ · 0.32 ¢ · judge sssp · orphans 1
> Die Ackerhummel ist ein Insekt aus der Ordnung Hymenoptera und in Mainz-Bingen von April bis September anzutreffen, mit Schwerpunkt im August. [F1,F2,F8] Der Bestand gilt als nicht gefährdet. [F4]
>
> Sie wurde beim Fressen von Gemeinem Flieder, Echtem Beinwell, Zaun-Wicke, Oregano, Gewöhnlicher Eselsdistel und Wiesen-Flockenblume beobachtet. [F5] Gartenkreuzspinnen, Krabbenspinnen, Hornissen und Bienenfresser zählen zu ihren Fressfeinden. [F6] ⚠️ 🟠
- s4 partial: 'Krabbenspinnen' fasst zwei unterschiedliche Arten verallgemeinernd zusammen, die Angabe geht über die konkreten Artnamen hinaus.
- s4 🟠 Krabbenspinnen zählen zu Fressfeinden

### Ackerhummel · *Bombus pascuorum* · en (insect, 10 lines) · validator ✓ · 0.30 ¢ · judge pspu · orphans 2
> The Common Carder Bee is a bumblebee found in Mainz-Bingen from March to October, with peak sightings in August. [F3,F8] ⚠️ 🟠 It is not threatened. [F4]
>
> It has been recorded visiting the flowers of Common Lilac, Devil's-Bit Scabious, Brown Knapweed, Greater Knapweed, Harebell, and many others, and feeding on Common Comfrey, Bush Vetch, Oregano, and Sainfoin. [F5,F7] ⚠️ Cross Orweavers, Goldenrod Crab Spiders, European hornets, and Ferruginous Bee-Grabbers have been recorded hunting it. [F6] ❌ 🟠
- s1 partial: Bumblebee not directly stated in cited lines; sightings recorded Mar–Oct not explicitly given (F8 gives Jan0,Feb0,Mar12...Oct18,Nov0,Dec0, so 'March to October' with nonzero is a reasonable inference but not stated as range); peak in August is supported.
- s1 🟠 It is a bumblebee
- s3 partial: F5 lists Common Comfrey, Bush Vetch, Oregano, Sainfoin as eaten, but F7 lists visited flowers separately; the sentence conflates 'flowers of' list with visiting when some items (Common Lilac, Devil's-Bit Scabious, Brown Knapweed, Greater Knapweed) appear in F5 (eats) not F7 (visits), and Harebell is in F7 not F5.
- s4 unsupported: F6 states it is eaten by these species, not that they 'hunt' it; hunting implies behaviour not stated.
- s4 🟠 They hunt it

### Rapsweißling · *Pieris napi* · de (insect, 9 lines) · validator ✓ · 0.36 ¢ · judge puusu · orphans 6
> Der Rapsweißling ist ein Schmetterling aus der Ordnung Lepidoptera und erscheint in Mainz-Bingen von April bis September, mit Höhepunkt im Juli. [F1,F2,F7] ⚠️ 🟠 Die meisten Beobachtungen fallen in die Monate April, Juni, Juli und August. [F7] ❌ 🟠
>
> Die Raupe wurde beim Fressen an Behaartem Schaumkraut, Weg-Rauke, Vogel-Wicke, Wiesen-Platterbse und vielen weiteren Pflanzen beobachtet. [F4] ❌ 🟠 Der Falter besucht Blüten von Kratzdistel, Flieder, Beinwell, Veilchen, Wicken und über 80 weiteren Pflanzenarten. [F6] Rauchschwalbe, Saatkrähe, Mauersegler, Star, Kleiber und Gartenkreuzspinne wurden beim Fressen von Rapsweißlingen beobachtet. [F5] ❌
- s1 partial: F4-Fresslinie nicht relevant; Zuordnung 'Falter' als Schmetterling korrekt, aber 'erscheint' impliziert Vorkommen als Beobachtungshäufigkeit, Juli als Höhepunkt ist gestützt, jedoch die Klasse Insecta wird nicht genannt und 'Schmetterling' als Übersetzung von Lepidoptera-Ordnung ist eine Zusatzaussage ohne Beleg
- s1 🟠 Rapsweißling ist ein Schmetterling
- s2 unsupported: Mai fehlt in der Liste, obwohl Mai laut Monatsprofil (51%) zu den häufigen Monaten zählt; die Auswahl der vier Monate ist eine eigene Interpretation, die nicht direkt aus den Prozentwerten folgt
- s2 🟠 meiste Beobachtungen in April, Juni, Juli, August
- s3 unsupported: F4 beschreibt Fressbeziehung des Schmetterlings insgesamt, nicht spezifisch der Raupe; die Raupe wird nicht erwähnt
- s3 🟠 Raupe frisst Behaartes Schaumkraut · Raupe frisst Weg-Rauke · Raupe frisst Vogel-Wicke · Raupe frisst Wiesen-Platterbse
- s5 unsupported: F5 beschreibt, dass diese Arten den Rapsweißling fressen, nicht dass sie beim Fressen beobachtet wurden im Sinne einer direkten Beobachtungsaussage; zudem fehlt Mönchsgrasmücke, Kernbeißer etc. nicht relevant, aber Aussage selbst ist im Kern durch F5 gedeckt

### Rapsweißling · *Pieris napi* · en (insect, 9 lines) · validator ✓ · 0.32 ¢ · judge ssssp · orphans 0
> The Green-veined white is a butterfly found in Mainz-Bingen from April to September, with peak sightings in July. [F3,F7] It belongs to the order Lepidoptera. [F1]
>
> It has been recorded eating Hairy Bittercress, Hedge Mustard, Tufted Vetch, Meadow vetchling, Lesser Celandine, Oregano, and Devil's-Bit Scabious. [F4] It visits flowers of Bull Thistle, Common Lilac, Common Comfrey, Sweet Violet, Harebell, and Bush Vetch, among many others. [F6] It is hunted by Barn swallows, Rooks, Common swifts, Dunnocks, Common starlings, and Cross Orbweavers. [F5] ⚠️
- s5 partial: 'hunted by' implies predation; Cross Orbweaver is a spider not a hunter in typical sense, and 'hunted' overstates 'is eaten by'.


## V2 · claude-sonnet-5

### Amsel · *Turdus merula* · de (bird, 16 lines) · validator ✓ · 0.82 ¢ · judge sssssssp · orphans 0
> Turdus merula ist eine Art aus der Klasse Aves und der Ordnung Passeriformes. [F1] Der deutsche Name lautet Amsel, der englische Common blackbird. [F2,F3] Der Bestand wird von der IUCN Red List als LC (nicht gefährdet) eingestuft. [F4] Die Art wiegt 103 g und hat eine Spannweite von 36 cm. [F6,F10] In der Region Mainz-Bingen wurden in zehn Jahren 6009 Meldungen erfasst, mit Hauptzeit im ganzen Jahr; die Meldungen sind im Januar am stärksten und im August am schwächsten. [F14]
>
> Die Art ernährt sich als Allesfresser und ist tagsüber aktiv. [F5,F8] Als Lebensraum werden Wald und Boden genannt, und die Art gilt als Standvogel. [F7,F11] Als Nahrung verzeichnet sind Gewöhnliche Robinie, Vogelknöterich, Rotbuche und Behaartes Schaumkraut. [F13] ⚠️
- s8 partial: Nur 4 von 12+188 genannten Arten ausgewählt, aber als vollständige Liste dargestellt

### Amsel · *Turdus merula* · en (bird, 16 lines) · validator ✓ · 0.71 ¢ · judge psssussss · orphans 0
> Turdus merula is a species of bird in the order Passeriformes. [F1] ⚠️ It is known as Common blackbird in English and Amsel in German. [F2,F3] The IUCN Red List classifies it as least concern. [F4] It has a mass of 103 g and a wingspan of 36 cm. [F6,F10] In Mainz-Bingen, 6009 reports were recorded over ten years, with reports occurring all year and peaking in January, staying high in December and February and dropping to their lowest in August. [F14] ❌
>
> It is an omnivore that lives in forest and on the ground and is active by day. [F5,F7,F8] It is a resident species that does not migrate, and offspring mature at 365 days. [F11,F12] In the wild it can live up to 21.8 years. [F9] Recorded food plants include Black Locust, Prostrate knotweed, Beech and Hairy Bittercress. [F13]
- s1 partial: class Aves not mentioned but implied as bird; species claim fine, but 'bird' claim relies on F1 group tag which is fine, so actually supported
- s5 unsupported: claims about peaking, staying high, dropping lowest are interpretive additions not directly stated as such, though derivable; 'lowest in August' is supported by data but phrasing as fact is fine; however 'peaking in January' and 'staying high' are inferred, acceptable rounding of data but let's mark partial for added interpretive framing

### Kleiner Feuerfalter · *Lycaena phlaeas* · de (insect, 11 lines) · validator ✗ 3 paragraphs, expected 2; p2: no sentences · 1.05 ¢ · judge ssssssss · orphans 0
> Die Art Lycaena phlaeas gehört zur Klasse Insecta und zur Ordnung Lepidoptera. [F1] Der deutsche Name lautet Kleiner Feuerfalter, der englische Small Copper. [F2,F3] In der Region Mainz-Bingen gibt es 126 Meldungen in zehn Jahren, mit Hauptzeit Apr–Mai und Jul–Okt. [F8] Das Monatsprofil zeigt den stärksten Wert im September, mit hohen Anteilen auch im April, Juli und August. [F8]
>
> 
>
> Als Nahrung verzeichnet sind Vogelknöterich, Gewöhnliche Kreuzblume, Vogel-Wicke und Zypressen-Wolfsmilch. [F4] Verzeichnet als Fressfeinde: Rauchschwalbe, Saatkrähe, Kernbeißer und Mauersegler. [F5] Bestäubt werden unter anderem Ranunculus ficaria, Esels-Wolfsmilch, Mittlerer Klee und Gemeiner Efeu. [F6] Besucht werden Blüten von Strahlenloser Kamille, Gewöhnlicher Kratzdistel, Hopfenklee und Pyrenäen-Storchschnabel. [F7]

### Kleiner Feuerfalter · *Lycaena phlaeas* · en (insect, 11 lines) · validator ✓ · 0.90 ¢ · judge sssssuss · orphans 0
> This species is Lycaena phlaeas, an insect in the order Lepidoptera. [F1] Its German name is Kleiner Feuerfalter and its English name is Small Copper. [F2,F3] In the Mainz-Bingen region, 126 reports over ten years show a main time of Apr–May and Jul–Oct. [F8] By month, activity as a percentage of the peak month rises from 7 in March to 53 in April, drops to 38 in May, dips to 11 in June, then climbs to 79 in July, 64 in August, and 100 in September before falling to 57 in October. [F8]
>
> Recorded food plants include Prostrate knotweed, Common Milkwort, Tufted Vetch and Cypress Spurge. [F4] Recorded predators include Barn swallow, Rook, Hawfinch and Common swift. [F5] ❌ It pollinates Ranunculus ficaria, Leafy Spurge, zigzag clover and English Ivy. [F6] It visits flowers of Disc Mayweed, Bull Thistle, Black Medick and Hedgerow Crane's-bill. [F7]
- s6 unsupported: F5 lists species that eat it, not predators framed causally beyond that; but 'predator' is a reasonable rephrase of 'is eaten by' so check terms - actually this is fine as restated eaten-by relationship, but original says 'is eaten by' not 'predators' - minor rewording acceptable, all four species listed.

### Fliegenpilz · *Amanita muscaria* · de (fungus, 10 lines) · validator ✓ · 0.76 ¢ · judge sssssps · orphans 0
> Amanita muscaria ist eine Art aus der Klasse Agaricomycetes, Ordnung Agaricales. [F1] Der deutsche Name lautet Fliegenpilz, der englische Fly Agaric. [F2,F3] Der Speisewert wird als giftig und psychoaktiv angegeben, das Sporenpulver ist weiß. [F4,F5] In der Region Mainz-Bingen gab es 19 Meldungen in zehn Jahren, mit Hauptzeit Oktober bis November. [F8] Das Monatsprofil zeigt den stärksten Wert im Oktober, gefolgt von November und September. [F8]
>
> Verzeichnet als Fressfeinde: Waldmistkäfer, Tigerschnegel, Sciurus niger, Ariolimax buttoni. [F6] ⚠️ Als Wirt verzeichnet sind Cladosporium epimyces, Hypomyces, Chalciporus piperatus und Hypomyces hyalinus. [F7]
- s6 partial: Nur vier von neun Arten genannt, 'Fressfeinde' ist eine Umdeutung von 'wird gefressen von'

### Fliegenpilz · *Amanita muscaria* · en (fungus, 10 lines) · validator ✓ · 0.69 ¢ · judge sssssus · orphans 0
> Amanita muscaria is a species of fungus in the class Agaricomycetes, order Agaricales. [F1] Its German name is Fliegenpilz and its English name is Fly Agaric. [F2,F3] It is considered poisonous and psychoactive, and it has a white spore print. [F4,F5] In the Mainz-Bingen region, 19 reports were logged over ten years, with the main time given as Oct–Nov. [F8] By month, reports there reached 13% of the peak in March, 3% in May, 17% in September, 100% in October, and 28% in November. [F8]
>
> Recorded predators include Waldmistkäfer (Anoplotrupes stercorosus), Great Grey Slug (Limax maximus), Sciurus niger, and Ariolimax buttoni. [F6] ❌ It is recorded as host of Cladosporium epimyces, Hypomyces, Chalciporus piperatus, and Hypomyces hyalinus. [F7]
- s6 unsupported: F6 lists species it is eaten by, not 'predators'; and the list is called 'recorded' but the term predator implies hunting behavior not stated.

### Feuersalamander · *Salamandra salamandra* · de (amphibian, 13 lines) · validator ✓ · 0.87 ¢ · judge sssssssss · orphans 0
> Die Art Salamandra salamandra gehört zur Klasse Amphibia und zur Ordnung Caudata. [F1] Der deutsche Name lautet Feuersalamander, der englische Name Fire salamander. [F2,F3] Die IUCN Red List führt die Art als VU (gefährdet). [F4] Die Länge beträgt 28 cm, das Gewicht 36 g. [F6,F7] In der Region Mainz-Bingen gab es 48 Meldungen in zehn Jahren, mit Hauptzeit März–Mai und August–Dezember. [F12]
>
> Die Nahrung besteht aus Gliederfüßern. [F5] Der Lebensraum umfasst Land, Wasser und Boden, aktiv ist die Art tagsüber, in der Dämmerung und nachts. [F8,F9] Als Nahrung verzeichnet sind Schwarzer Schnegel, Italienische Schönschrecke, Blue Carpenter Bee und Mistbiene. [F10] Verzeichnet als Fressfeinde: Kranich, Kleiner Wasserfrosch, Domestic Cat und Wildschwein. [F11]

### Feuersalamander · *Salamandra salamandra* · en (amphibian, 13 lines) · validator ✓ · 0.73 ¢ · judge ssssssss · orphans 0
> Salamandra salamandra is an amphibian species in the order Caudata, known in German as Feuersalamander and in English as the Fire salamander. [F1,F2,F3] It is classified as vulnerable (VU) on the IUCN Red List. [F4] It reaches a length of 28 cm and a mass of 36 g. [F6,F7] It lives on land, in water and underground, and is active by day, at dusk and dawn, and at night. [F8,F9] In the Mainz-Bingen region, 48 reports were recorded over ten years, mainly from March to May and August to December, with the highest activity in October. [F12]
>
> Its diet consists of arthropods. [F5] Recorded food items include Ash-black Slug, Italienische Schönschrecke, Blue Carpenter Bee and Drone Fly. [F10] Recorded predators include Common crane, Pool frog, Domestic Cat and Wild boar. [F11]

### Große Brennnessel · *Urtica dioica* · de (plant, 14 lines) · validator ✓ · 0.89 ¢ · judge sssssspp · orphans 0
> Urtica dioica ist eine Art aus der Klasse Magnoliopsida und der Ordnung Rosales. [F1] Der deutsche Name lautet Große Brennnessel, der englische Name Stinging Nettle. [F2,F3] Der Status der IUCN Red List ist LC, also nicht gefährdet. [F4] Die Pflanze ist eine Staude, die bis zu 3 m hoch wird und von Mai bis Oktober blüht. [F5,F6,F7] Die Bestäubung erfolgt durch Wind. [F8] In der Region Mainz-Bingen gab es in zehn Jahren 259 Meldungen, mit Hauptzeit April bis Juli. [F12]
>
> Als Nahrung verzeichnet sind Colpocephalum indi, Splendoroffula tauracobia, Eomenopon ryani und Myrsidea breviventris. [F9] ⚠️ Verzeichnet als Fressfeinde: Chrysomela polita, Siebenpunkt-Marienkäfer, Kleiner Fuchs und Zweipunkt-Marienkäfer. [F10] ⚠️
- s7 partial: Eomenopon sintillatae aus F9 fehlt, sonst korrekt; Liste ist unvollständig wiedergegeben ohne Kennzeichnung.
- s8 partial: F10 listet Fressfeinde als 'wird gefressen von', Liste ist unvollständig (30 weitere) ohne Kennzeichnung, sonst korrekt übernommen.

### Große Brennnessel · *Urtica dioica* · en (plant, 14 lines) · validator ✓ · 0.83 ¢ · judge sssssppss · orphans 0
> Urtica dioica is a species of plant in the order Rosales, class Magnoliopsida. [F1] Its German name is Große Brennnessel and its English name is Stinging Nettle. [F2,F3] The IUCN Red List classifies it as least concern. [F4] It is a perennial herb that grows up to 3 m tall. [F5,F6] It flowers from May to October and is pollinated by wind. [F7,F8] In Mainz-Bingen, 259 reports were recorded over ten years, mainly from April to July, with the peak in May. [F12] ⚠️
>
> Als Nahrung verzeichnet sind Colpocephalum indi, Splendoroffula tauracobia, Eomenopon ryani and Myrsidea breviventris. [F9] ⚠️ Verzeichnet als Fressfeinde: Chrysomela polita, Sevenspotted Lady Beetle, Small tortoiseshell and 2-spot Ladybird. [F10] It is host to Garden tiger moth, Map, Small tortoiseshell and Peacock. [F11]
- s6 partial: peak month is derived (May=100%) but not explicitly stated as 'the peak'; main time matches, but calling May 'the peak' beyond simple report; acceptable rounding otherwise minor.
- s7 partial: omits Eomenopon sintillatae from the food list, understating the cited fact.

### Nosferatu-Spinne · *Zoropsis spinimana* · de (insect, 6 lines) · validator ✓ · 0.51 ¢ · judge sssss · orphans 0
> Die Art Zoropsis spinimana gehört zur Klasse Arachnida und zur Ordnung Araneae. [F1] Der deutsche Name lautet Nosferatu-Spinne, der englische Name Zoropsid spider. [F2,F3] In der Region Mainz-Bingen gab es in zehn Jahren 1077 Meldungen, mit Hauptzeit von August bis November. [F5] Das Monatsprofil zeigt den stärksten Wert im September, gefolgt von Oktober und November. [F5]
>
> Als Nahrung verzeichnet sind Araneae und Lepidoptera. [F4]

### Nosferatu-Spinne · *Zoropsis spinimana* · en (insect, 6 lines) · validator ✓ · 0.67 ¢ · judge ssss · orphans 0
> The species is Zoropsis spinimana, an arachnid of the order Araneae, classed as a spider. [F1] Its English name is Zoropsid spider, while in German it is called Nosferatu-Spinne. [F3,F2] In Mainz-Bingen, 1077 reports over ten years show the main time as Aug–Nov, with September the peak month and October and November also high. [F5]
>
> Als Nahrung verzeichnet sind Araneae und Lepidoptera. [F4]

### Kranich · *Grus grus* · de (bird, 15 lines) · validator ✓ · 0.89 ¢ · judge sssssssp · orphans 0
> Grus grus ist eine Art aus der Klasse Aves und der Ordnung Gruiformes und wird auf Deutsch Kranich, auf Englisch Common crane genannt. [F1,F2,F3] Der Bestand gilt laut IUCN Red List als nicht gefährdet (LC). [F4] Der Kranich wiegt 5,5 kg und hat eine Spannweite von 2,2 m. [F6,F10] In der Region Mainz-Bingen gab es 977 Meldungen in zehn Jahren, mit Hauptzeit im Februar sowie von Oktober bis Dezember. [F14] Das Monatsprofil zeigt die höchsten Werte im Februar sowie im Oktober, November und Dezember, während von Mai bis September kaum Meldungen vorliegen. [F14]
>
> Der Kranich ist ein Allesfresser, tagsüber aktiv und lebt im Lebensraum Feuchtgebiet. [F5,F8,F7] Er ist ein Zugvogel und kann in freier Wildbahn bis zu 43 Jahre alt werden. [F11,F9] Als Nahrung verzeichnet sind Grasfrosch, Alpenstrandläufer, Bluthänfling und Kleiner Wasserfrosch, verzeichnet als Fressfeinde ist die Rabenkrähe. [F12,F13] ⚠️
- s8 partial: Nur vier von zwölf gelisteten Nahrungsarten genannt, Auswahl impliziert Vollständigkeit nicht gegeben, aber Formulierung selbst korrekt zitiert nur Teilmenge ohne Zusatzbehauptung; als partial markiert wegen unvollständiger Wiedergabe der Liste ohne Hinweis auf weitere Arten.

### Kranich · *Grus grus* · en (bird, 15 lines) · validator ✓ · 0.65 ¢ · judge ssssssss · orphans 0
> Grus grus is a bird species in the order Gruiformes. [F1] Its German name is Kranich and its English name is Common crane. [F2,F3] The IUCN Red List classifies it as least concern. [F4] It has a mass of 5.5 kg and a wingspan of 2.2 m. [F6,F10] In Mainz-Bingen, 977 reports over ten years show a main time of Feb · Oct–Dec, with February the peak month and October and November also high. [F14]
>
> It is an omnivore that lives in wetland habitat, is active by day, and migrates. [F5,F7,F8,F11] Recorded food includes Common frog, Dunlin, Common linnet and Pool frog. [F12] Recorded predators include the Carrion crow, and it can live up to 43 years in the wild. [F13,F9]

### Hirschkäfer · *Lucanus cervus* · de (insect, 8 lines) · validator ✓ · 0.65 ¢ · judge ssssss · orphans 0
> Die Art Lucanus cervus gehört zur Klasse Insecta und zur Ordnung Coleoptera. [F1] Der deutsche Name lautet Hirschkäfer, der englische Name Stag Beetle. [F2,F3] Der Status nach der IUCN Red List ist LC (nicht gefährdet). [F4] In der Region Mainz-Bingen liegen 63 Meldungen aus zehn Jahren vor, mit Hauptzeit Juni–Juli. [F7]
>
> Als Nahrung verzeichnet sind Rotbuche, Vogelkirsche, Gemeine Esche und Stieleiche. [F5] Verzeichnet als Fressfeinde: Turmfalke, Aves, Bubulcus ibis und Carabus sibiricus. [F6]

### Hirschkäfer · *Lucanus cervus* · en (insect, 8 lines) · validator ✓ · 0.68 ¢ · judge sssspps · orphans 1
> Lucanus cervus is a species of insect in the order Coleoptera, class Insecta. [F1] Its German name is Hirschkäfer and its English name is Stag Beetle. [F2,F3] The IUCN Red List classifies its status as least concern. [F4] In the region of Mainz-Bingen, 63 reports were recorded in ten years, with the main time being June to July. [F7] The month profile shows activity starting in May, peaking in June, and dropping off by August, with none recorded from September through December. [F7] ⚠️ 🟠
>
> Als Nahrung verzeichnet sind Beech (Fagus sylvatica), Sweet Cherry (Prunus avium), European ash (Fraxinus excelsior) and Pedunculate Oak (Quercus robur). [F5] ⚠️ Verzeichnet als Fressfeinde: Common kestrel (Falco tinnunculus), Aves (Aves), Bubulcus ibis (Bubulcus ibis) and Carabus sibiricus (Carabus sibiricus). [F6]
- s5 partial: October value of 5 is omitted, implying zero through the whole Sep-Dec range.
- s5 🟠 None recorded September through December
- s6 partial: Presents four of 39 food items without indicating list is partial in a way matching source, though phrasing implies completeness.

### Grasfrosch · *Rana temporaria* · de (amphibian, 15 lines) · validator ✓ · 0.98 ¢ · judge sssssssspps · orphans 0
> Rana temporaria ist eine Art aus der Klasse Amphibia und der Ordnung Anura. [F1] Der deutsche Name lautet Grasfrosch, der englische Common frog. [F2,F3] Die IUCN Red List stuft die Art als LC, also nicht gefährdet, ein. [F4] Die Länge beträgt 11 cm, das Gewicht 48 g. [F6,F7] In der Region Mainz-Bingen gab es 71 Meldungen in zehn Jahren, mit Feb–Apr als Hauptzeit. [F13] Das Monatsprofil zeigt den stärksten Wert im März, mit 31 % im Februar und 29 % im April. [F13]
>
> Als Nahrung verzeichnet ist Gliederfüßer. [F5] Als Lebensraum gelten an Land, im Wasser und auf Bäumen, aktiv ist die Art tagsüber und nachts. [F8,F9] Als Nahrung verzeichnet sind Garten-Bänderschnecke, Bellardia pubicornis, Trichoptera und Calliphoridae. [F10] ⚠️ Verzeichnet als Fressfeinde: Rotfuchs, Saatkrähe, Kranich und Weißstorch. [F11] ⚠️ Als Parasit ist Nematoda verzeichnet. [F12]
- s9 partial: Nur 4 von 9 gelisteten Beutearten genannt, Auswahl ohne Kennzeichnung als Beispiel.
- s10 partial: Nur 4 von 12+176 gelisteten Fressfeinden genannt, ohne Hinweis auf weitere.

### Grasfrosch · *Rana temporaria* · en (amphibian, 15 lines) · validator ✓ · 0.72 ¢ · judge sssssssss · orphans 0
> Rana temporaria is an amphibian species in the order Anura, known in German as Grasfrosch and in English as Common frog. [F1,F2,F3] Its conservation status is LC (least concern). [F4] It reaches a mass of 48 g and a length of 11 cm. [F6,F7] It lives on land, in water and in trees, and is active both by day and at night. [F8,F9] In Mainz-Bingen, 71 reports were recorded over ten years, mainly from February to April, peaking in March. [F13]
>
> Its diet consists of arthropods. [F5] Recorded food includes White-lipped snail, Bellardia pubicornis, Trichoptera and Calliphoridae. [F10] Recorded predators include Red fox, Rook, Common crane and White stork. [F11] It is recorded as a host of Nematoda parasites. [F12]

### Schwarz-Erle · *Alnus glutinosa* · de (plant, 12 lines) · validator ✓ · 0.82 ¢ · judge sssspus · orphans 0
> Alnus glutinosa ist eine Art aus der Klasse Magnoliopsida und der Ordnung Fagales. [F1] Der deutsche Name lautet Schwarz-Erle, der englische Name Black Alder. [F2,F3] Die Rote Liste der IUCN führt die Art als LC, also nicht gefährdet. [F4] Sie wird als Baum oder Strauch bis zu 25 m hoch und blüht im April, wobei die Bestäubung durch Wind erfolgt. [F5,F6,F7,F8] In der Region Mainz-Bingen gab es 27 Meldungen in zehn Jahren, mit Meldungen über das ganze Jahr verteilt und dem höchsten Wert im Dezember. [F11] ⚠️
>
> Verzeichnet als Fressfeinde: Moschusbock, Halsbandsittich, Saatkrähe und Brauner Bär. [F9] ❌ Wirt ist die Art unter anderem für Schneespanner, Variegated Golden Tortrix, Schmetterlings-Tramete und Graugelber Breitflügelspanner. [F10]
- s5 partial: Hauptzeit ist 'Ganzes Jahr', nicht dass Meldungen gleichmäßig verteilt sind; höchster Wert Dezember ist korrekt aber Formulierung suggeriert Gleichverteilung zusätzlich zum Höchstwert
- s6 unsupported: F9 listet Arten, die die Pflanze fressen, nicht Fressfeinde der Pflanze im Sinne von Prädatoren - Begriff 'Fressfeinde' ist eine unpassende Umdeutung; zudem fehlen weitere gelistete Arten ohne Fehler, aber Kategorisierung falsch

### Schwarz-Erle · *Alnus glutinosa* · en (plant, 12 lines) · validator ✓ · 0.73 ¢ · judge ssssspus · orphans 1
> Alnus glutinosa is a species of plant in the class Magnoliopsida and order Fagales. [F1] Its English name is Black Alder, and in German it is called Schwarz-Erle. [F2,F3] The IUCN Red List classifies it as LC (least concern). [F4] It is a tree or shrub that grows up to 25 m tall. [F5,F6] It flowers in April and is pollinated by wind. [F7,F8] In Mainz-Bingen, 27 reports over ten years show records throughout the whole year, with December reaching the peak month value and March, April and May among the lowest. [F11] ⚠️ 🟠
>
> Recorded food plants include the Musk beetle, Rose-ringed parakeet, Rook and Garden tiger moth, among others. [F9] ❌ It is recorded as a host of the Pale Brindled Beauty, Variegated Golden Tortrix, Turkeytail and Dotted border, among others. [F10]
- s6 partial: May is not clearly among the lowest values; Feb is lower than May.
- s6 🟠 May is among the lowest months
- s7 unsupported: F9 lists species that eat the plant, not 'food plants' of the alder; term reverses relationship.

### Dunkle Erdhummel · *Bombus terrestris* · de (insect, 9 lines) · validator ✓ · 0.89 ¢ · judge sssssss · orphans 0
> Bombus terrestris ist eine Art aus der Ordnung Hymenoptera in der Klasse Insecta. [F1] Der deutsche Name lautet Dunkle Erdhummel, im Englischen wird sie Buff-tailed Bumblebee genannt. [F2,F3] In der Region Mainz-Bingen liegen aus zehn Jahren 728 Meldungen vor, mit Hauptzeit von Februar bis September. [F7] Das Monatsprofil zeigt die höchsten Werte im Juni und Juli, während Januar und Dezember kaum oder keine Meldungen aufweisen. [F7]
>
> Als Nahrung verzeichnet sind Kulturapfel, Borretsch, Möhre und Roter Fingerhut. [F4] Verzeichnet als Fressfeinde: Gartenkreuzspinne, Eichblatt-Radspinne, Veränderliche Krabbenspinne und Südliche Glanz-Krabbenspinne. [F5] Besucht werden unter anderem die Blüten von Gewöhnlicher Robinie, Hopfenklee, Pyrenäen-Storchschnabel und Gewöhnlicher Rosskastanie. [F6]

### Dunkle Erdhummel · *Bombus terrestris* · en (insect, 9 lines) · validator ✓ · 0.73 ¢ · judge sssssss · orphans 0
> This species is Bombus terrestris, a species of insect in the order Hymenoptera. [F1] Its English name is Buff-tailed Bumblebee, and in German it is called Dunkle Erdhummel. [F2,F3] In the Mainz-Bingen region, 728 reports were recorded over ten years, with the main time being Feb–Sep. [F7] The month profile as a percentage of the peak month shows the highest values in June and July, at 99 and 100 percent, with lower numbers in the winter months. [F7]
>
> Recorded food plants include Apple, Borage, Queen Anne's Lace and Foxglove. [F4] Recorded predators include Cross Orbweaver, Oak Spider, Goldenrod Crab Spider and Shiny crab-spider. [F5] It visits flowers of Black Locust, Black Medick, Hedgerow Crane's-bill and Horse-chestnut. [F6]

### Schachbrett · *Melanargia galathea* · de (insect, 9 lines) · validator ✓ · 0.98 ¢ · judge ssspssss · orphans 0
> Melanargia galathea ist eine Art aus der Ordnung Lepidoptera, Klasse Insecta. [F1] Der deutsche Name lautet Schachbrett, der englische Marbled White. [F2,F3] In der Region Mainz-Bingen liegen 644 Meldungen aus zehn Jahren vor, mit Hauptzeit Juni–Juli. [F8] Im Monatsprofil erreicht Mai 2 %, Juni 100 % und Juli 63 % des stärksten Monats, während von Januar bis April sowie von August bis Dezember keine oder kaum Meldungen auftreten. [F8] ⚠️
>
> Als Nahrung verzeichnet sind Strahlenlose Kamille, Gemeiner Hohlzahn, Rundblättrige Glockenblume und Wiesen-Lieschgras. [F4] Verzeichnet als Fressfeinde sind Rauchschwalbe, Saatkrähe, Kernbeißer und Mauersegler. [F5] Bestäubt werden unter anderem Weg-Distel, Vogel-Wicke, Mittlerer Klee und Oregano. [F6] Besucht werden Blüten von Strahlenloser Kamille, Gewöhnlicher Kratzdistel, Rundblättriger Glockenblume und Weg-Distel. [F7]
- s4 partial: 'keine oder kaum Meldungen' für Jan-Apr und Aug-Dez fasst 0% und 1% zusammen, Aug hat 1% nicht 0%

### Schachbrett · *Melanargia galathea* · en (insect, 9 lines) · validator ✓ · 0.77 ¢ · judge sssssssu · orphans 0
> Melanargia galathea is an insect species in the order Lepidoptera. [F1] Its English name is Marbled White, and in German it is called Schachbrett. [F3,F2] In the Mainz-Bingen region, 644 reports were recorded over ten years, with the main time being June–July. [F8] The month profile peaks in June, with July still at 63% of the peak and May at only 2%. [F8]
>
> Recorded food plants include Disc Mayweed, Common Hemp-Nettle, Harebell and Timothy. [F4] It visits flowers of Disc Mayweed, Bull Thistle, Harebell and Plumeless thistle. [F7] It pollinates Plumeless thistle, Tufted Vetch, zigzag clover and Oregano. [F6] Recorded predators include Barn swallow, Rook, Hawfinch and Common swift. [F5] ❌
- s8 unsupported: Predators mislabeled; F5 states it is eaten by these species, not that they are 'predators' specifically, though this is close; however calling them 'predators' implies a hunting relationship not directly asserted beyond being eaten by, minor overreach.

### Europäische Gottesanbeterin · *Mantis religiosa* · de (insect, 8 lines) · validator ✓ · 0.76 ¢ · judge sssssss · orphans 0
> Die Art Mantis religiosa gehört zur Klasse Insecta und zur Ordnung Mantodea. [F1] Der deutsche Name lautet Europäische Gottesanbeterin, der englische Name European mantis. [F2,F3] Die IUCN Red List stuft die Art als LC, also nicht gefährdet, ein. [F4] In der Region Mainz-Bingen gibt es 630 Meldungen in zehn Jahren, mit Hauptzeit Aug–Sep. [F7] Das Monatsprofil zeigt die höchsten Werte im September mit 100 Prozent und im August mit 76 Prozent des stärksten Monats. [F7]
>
> Als Nahrung verzeichnet sind Weißrandiger Grashüpfer, Italienische Schönschrecke, Haus-Feldwespe und Brauner Grashüpfer. [F5] Verzeichnet als Fressfeinde: Saatkrähe, Weißstorch, Fasan und Rabenkrähe. [F6]

### Europäische Gottesanbeterin · *Mantis religiosa* · en (insect, 8 lines) · validator ✓ · 0.59 ¢ · judge ssssus · orphans 4
> Mantis religiosa is an insect species in the order Mantodea. [F1] Its German name is Europäische Gottesanbeterin and its English name is European mantis. [F2,F3] The IUCN Red List classifies it as least concern. [F4] In Mainz-Bingen, 630 reports were recorded over ten years, with the main time being August–September and September being the peak month. [F7]
>
> Recorded food plants include Lesser Marsh Grasshopper, Italienische Schönschrecke, European paper wasp and Common field grasshopper. [F5] ❌ 🟠 Recorded predators include Rook, White stork, Common pheasant and Carrion crow. [F6]
- s5 unsupported: F5 lists prey (food), not food plants; the species eats insects, not plants.
- s5 🟠 Lesser Marsh Grasshopper is a recorded food plant · Italienische Schönschrecke is a recorded food plant · European paper wasp is a recorded food plant · Common field grasshopper is a recorded food plant

### Tagpfauenauge · *Aglais io* · de (insect, 10 lines) · validator ✓ · 1.03 ¢ · judge ssssssss · orphans 0
> Die Art trägt den wissenschaftlichen Namen Aglais io und gehört zur Ordnung Lepidoptera in der Klasse Insecta. [F1] Der deutsche Name lautet Tagpfauenauge, der englische Peacock. [F2,F3] In der Region Mainz-Bingen liegen aus zehn Jahren 625 Meldungen vor, mit Hauptzeit von März bis April, Juni bis Juli und im September. [F8] Im Monatsprofil erreicht der Juli 100 Prozent des stärksten Monats, während der März bei 83 Prozent und der April bei 61 Prozent liegt. [F8]
>
> Als Nahrung verzeichnet sind Ranunculus ficaria, Echte Nelkenwurz, Weg-Distel und Vogel-Wicke. [F4] Verzeichnet als Fressfeinde: Rauchschwalbe, Saatkrähe, Kernbeißer und Mauersegler. [F5] Bestäubt werden unter anderem Duftveilchen, Echter Baldrian, Gewöhnlicher Teufelsabbiss und Skabiosen-Flockenblume. [F6] Blüten besucht die Art bei Strahlenloser Kamille, Gewöhnlicher Kratzdistel, Ranunculus ficaria und Gemeinem Flieder. [F7]

### Tagpfauenauge · *Aglais io* · en (insect, 10 lines) · validator ✓ · 0.83 ¢ · judge ssspsuss · orphans 1
> Aglais io is a species of insect in the order Lepidoptera. [F1] Its German name is Tagpfauenauge and its English name is Peacock. [F2,F3] In the Mainz-Bingen region, 625 reports were recorded over ten years, with the main time being March–April, June–July and September. [F8] The month profile as a percentage of the peak month shows highest values in March and July, with lower activity from November through February. [F8] ⚠️ 🟠
>
> Recorded food plants include Ranunculus ficaria, Wood Avens, Plumeless thistle and Tufted Vetch. [F4] Recorded predators include Barn swallow, Rook, Hawfinch and Common swift. [F5] ❌ It pollinates Sweet Violet, Valerian, Devil's-Bit Scabious and Greater Knapweed. [F6] It visits the flowers of Disc Mayweed, Bull Thistle, Ranunculus ficaria and Common Lilac. [F7]
- s4 partial: claims low activity Nov-Feb beyond stated peak values; Dec/Jan low but Feb 11 not clearly 'lower activity' distinct from other months, and phrasing implies a trend not stated
- s4 🟠 lower activity from November through February
- s6 unsupported: F5 states these are eaten by, not predators in a defined sense but claim as 'predators' is an interpretive label beyond raw fact; also list items should be verified

### Admiral · *Vanessa atalanta* · de (insect, 11 lines) · validator ✓ · 1.02 ¢ · judge ssssssus · orphans 0
> Die Art Vanessa atalanta gehört zur Klasse Insecta und zur Ordnung Lepidoptera. [F1] Der deutsche Name lautet Admiral, der englische Red Admiral. [F2,F3] Der Bestand wird auf der IUCN Red List als LC, also nicht gefährdet, eingestuft. [F4] In der Region Mainz-Bingen liegen 594 Meldungen aus zehn Jahren vor, mit Hauptzeit Februar bis April und Juni bis Oktober. [F9] Das Monatsprofil zeigt die höchsten Werte im Juli und August, mit 100 % beziehungsweise 98 % des stärksten Monats. [F9]
>
> Als Nahrung verzeichnet sind unter anderem Gewöhnliche Robinie, Gewöhnliche Kratzdistel, Efeu-Ehrenpreis und Gemeiner Flieder. [F5] Verzeichnet als Fressfeinde: Rauchschwalbe, Saatkrähe, Kernbeißer und Mauersegler. [F6] ❌ Bestäubt werden unter anderem Pyrenäen-Storchschnabel, Kulturapfel, Vogelkirsche und Gewöhnlicher Spindelstrauch, deren Blüten außerdem besucht werden. [F7,F8]
- s7 unsupported: F6 listet diese Arten als Fressfeinde, die die Art frisst (wird gefressen von), nicht als Fressfeinde im Sinne von Prädatoren-Bezeichnung ist irreführend formuliert, aber inhaltlich stimmt die Zuordnung – dennoch als Feindbegriff nicht exakt gedeckt

### Admiral · *Vanessa atalanta* · en (insect, 11 lines) · validator ✓ · 0.84 ¢ · judge ssspssss · orphans 2
> Vanessa atalanta is a species of insect in the order Lepidoptera. [F1] Its German name is Admiral and its English name is Red Admiral. [F2,F3] The IUCN Red List gives its status as least concern. [F4] In Mainz-Bingen, 594 reports over ten years show the main time as Feb–Apr and Jun–Oct, with activity rising from January, peaking in July and August, and declining again by December. [F9] ⚠️ 🟠
>
> Recorded food plants include Black Locust, Bull Thistle, ivy-leaved speedwell and Common Lilac. [F5] Recorded predators include Barn swallow, Rook, Hawfinch and Common swift. [F6] It is recorded pollinating Hedgerow Crane's-bill, Apple, Sweet Cherry and European Spindletree. [F7] It is recorded visiting the flowers of Bull Thistle, Hedgerow Crane's-bill, Common Lilac and Plumeless thistle. [F8]
- s4 partial: 'rising from January' and 'declining again by December' are not directly stated; peak described as July and August but actual peak is July only (Aug is 98%, close but stated as co-peak)
- s4 🟠 activity rises from January · activity declines again by December

### Westliche Honigbiene · *Apis mellifera* · de (insect, 11 lines) · validator ✗ 3 paragraphs, expected 2; p2: no sentences · 1.00 ¢ · judge ssssusss · orphans 0
> Die Art Apis mellifera gehört zur Klasse Insecta und zur Ordnung Hymenoptera. [F1] Der deutsche Name lautet Westliche Honigbiene, der englische Western honey bee. [F2,F3] Der IUCN-Status ist DD, also ungenügende Daten. [F4] In Mainz-Bingen liegen aus zehn Jahren 593 Meldungen vor, mit Hauptzeit von Februar bis Oktober. [F8] Das Monatsprofil zeigt die höchsten Werte im Juni und August mit jeweils 100 Prozent des stärksten Monats. [F8] ❌
>
> 
>
> Als Nahrung verzeichnet sind Gewöhnliche Robinie, Gewöhnliche Kratzdistel, Hopfenklee und Gewöhnliche Rosskastanie. [F5] Verzeichnet als Fressfeinde sind Bienenwolf, Gartenkreuzspinne, Mönchsgrasmücke und Grünes Heupferd. [F6] Besucht werden unter anderem Blüten von Vogelknöterich, Pyrenäen-Storchschnabel, Esels-Wolfsmilch und Stinkende Nieswurz. [F7]
- s5 unsupported: August hat laut F8 nur 100% im Monatsprofil ist falsch - Aug ist 100, aber Juli ist ebenfalls hoch; jedoch die Aussage nennt nur Juni und August, während Aug tatsächlich 100 ist, das stimmt, aber lässt aus dass auch Jun=100 und Aug=100 beide korrekt sind laut Daten - prüfen: Jun 100, Aug 100 stimmt tatsächlich mit Fakten überein.

### Westliche Honigbiene · *Apis mellifera* · en (insect, 11 lines) · validator ✓ · 0.81 ¢ · judge ssssussu · orphans 1
> Apis mellifera is a species of insect in the order Hymenoptera, class Insecta. [F1] Its German name is Westliche Honigbiene and its English name is Western honey bee. [F2,F3] The IUCN Red List lists its status as data deficient. [F4] In the Mainz-Bingen region, 593 reports were recorded over ten years, mainly from February to October. [F8] The monthly profile there peaks in June and August, with high shares also in July and March. [F8] ❌ 🟠
>
> Recorded food plants include Black Locust, Bull Thistle, Black Medick and Horse-chestnut, among 126 more. [F5] It visits flowers of Prostrate knotweed, Hedgerow Crane's-bill, Leafy Spurge and Stinking Hellebore, among 32 more. [F7] Recorded predators include European beewolf, Cross Orbweaver, Eurasian blackcap and Great Green Bush-cricket, among 6 more. [F6] ❌
- s5 unsupported: Peak is June and August tied at 100%, but July and March are not the next-highest values; March is only 54% while September and July are higher, so 'high shares also in July and March' misrepresents the ranking.
- s5 🟠 high share also in March
- s8 unsupported: F6 lists these as predators/eaters but calling them 'predators' generally is fine; however the sentence omits nothing wrong except the term itself is consistent with 'is eaten by', so check count: 6 more matches.

### Hauhechel-Bläuling · *Polyommatus icarus* · de (insect, 10 lines) · validator ✓ · 1.00 ¢ · judge ssssssss · orphans 0
> Polyommatus icarus ist eine Art aus der Ordnung Lepidoptera in der Klasse Insecta. [F1] Der deutsche Name lautet Hauhechel-Bläuling, der englische Common blue. [F2,F3] In der Region Mainz-Bingen liegen 580 Meldungen aus zehn Jahren vor, mit Hauptzeit von Mai bis September. [F8] Das Monatsprofil zeigt die höchsten Werte im Juli, August und September, während von November bis März keine Meldungen auftreten. [F8]
>
> Als Nahrung verzeichnet sind Strahlenlose Kamille, Hopfenklee, Vogel-Wicke und Kleiner Klappertopf. [F4] Verzeichnet als Fressfeinde: Rauchschwalbe, Saatkrähe, Kernbeißer und Mauersegler. [F5] Bestäubt werden unter anderem Ranunculus ficaria, Ringelblume, Borretsch und Gelber Blasenstrauch. [F6] Besucht werden Blüten von Gewöhnlicher Kratzdistel, Hopfenklee, Pyrenäen-Storchschnabel und Rapunzel-Glockenblume. [F7]

### Hauhechel-Bläuling · *Polyommatus icarus* · en (insect, 10 lines) · validator ✓ · 0.79 ¢ · judge sssssss · orphans 0
> Polyommatus icarus is a species of insect in the order Lepidoptera. [F1] Its English name is Common blue, and its German name is Hauhechel-Bläuling. [F3,F2] In Mainz-Bingen, 580 reports over ten years show the main time as May–Sep, with numbers rising from April, peaking in September, and dropping off by October. [F8]
>
> Recorded food plants include Disc Mayweed, Black Medick, Tufted Vetch and Yellow-Rattle, among others. [F4] Recorded predators include Barn swallow, Rook, Hawfinch and Common swift, among others. [F5] It pollinates plants such as Ranunculus ficaria, Pot Marigold, Borage and Bladder senna. [F6] It visits the flowers of Bull Thistle, Black Medick, Hedgerow Crane's-bill and rampion bellflower. [F7]

### Kleiner Kohlweißling · *Pieris rapae* · de (insect, 10 lines) · validator ✓ · 0.91 ¢ · judge sssssss · orphans 0
> Die Art trägt den wissenschaftlichen Namen Pieris rapae und gehört zur Klasse Insecta, Ordnung Lepidoptera. [F1] Der deutsche Name lautet Kleiner Kohlweißling, der englische Small White. [F2,F3] In der Region Mainz-Bingen liegen 576 Meldungen aus zehn Jahren vor, mit Hauptzeit Juni bis September. [F7] Das Monatsprofil zeigt den stärksten Wert im August, mit hohen Anteilen auch im Juli und September. [F7]
>
> Als Nahrung verzeichnet sind Gewöhnliche Kratzdistel, Efeu-Ehrenpreis, Behaartes Schaumkraut und Ranunculus ficaria. [F4] Verzeichnet als Fressfeinde: Rauchschwalbe, Saatkrähe, Kernbeißer und Mauersegler. [F5] Blüten besucht werden unter anderem von Strahlenloser Kamille, Duftveilchen, Kleinem Klappertopf und Waldgeißblatt. [F6]

### Kleiner Kohlweißling · *Pieris rapae* · en (insect, 10 lines) · validator ✓ · 0.73 ¢ · judge ssssss · orphans 0
> The species is Pieris rapae, an insect of the order Lepidoptera. [F1] Its German name is Kleiner Kohlweißling and its English name is Small White. [F2,F3] In Mainz-Bingen, 576 reports over ten years show the main time as Jun–Sep, with numbers rising from 7% of the peak in March to the peak in August, then falling to 3% by November and December. [F7]
>
> Recorded food plants include Bull Thistle, ivy-leaved speedwell, Hairy Bittercress and Ranunculus ficaria. [F4] Recorded predators include Barn swallow, Rook, Hawfinch and Common swift. [F5] It visits flowers of Disc Mayweed, Sweet Violet, Yellow-Rattle and European honeysuckle. [F6]

### Ackerhummel · *Bombus pascuorum* · de (insect, 10 lines) · validator ✓ · 0.99 ¢ · judge ssssssss · orphans 0
> Bombus pascuorum ist eine Art aus der Ordnung Hymenoptera in der Klasse Insecta. [F1] Der deutsche Name lautet Ackerhummel, der englische Common Carder Bee. [F2,F3] Die IUCN Red List führt die Art als LC, also nicht gefährdet. [F4] In der Region Mainz-Bingen liegen aus zehn Jahren 572 Meldungen vor, mit Hauptzeit von April bis September. [F8] Das Monatsprofil zeigt den stärksten Wert im August, während Januar, Februar, November und Dezember bei 0 % liegen. [F8]
>
> Als Nahrung verzeichnet sind unter anderem Gemeiner Flieder, Echter Beinwell, Zaun-Wicke und Drüsenblättrige Kugeldistel. [F5] Verzeichnet als Fressfeinde: Gartenkreuzspinne, Eichblatt-Radspinne, Veränderliche Krabbenspinne und Südliche Glanz-Krabbenspinne. [F6] Blüten besucht die Art unter anderem bei Pyrenäen-Storchschnabel, Stinkender Nieswurz, Gemeinem Flieder und Rapunzel-Glockenblume. [F7]

### Ackerhummel · *Bombus pascuorum* · en (insect, 10 lines) · validator ✓ · 0.76 ¢ · judge ssspssu · orphans 0
> Bombus pascuorum is a species of insect in the order Hymenoptera. [F1] Its German name is Ackerhummel and its English name is Common Carder Bee. [F2,F3] The IUCN Red List classifies it as least concern. [F4] In the Mainz-Bingen region, 572 reports were recorded over ten years, mainly from April to September, with the month profile rising from March through a peak in August and declining by October. [F8] ⚠️
>
> Recorded food plants include Common Lilac, Common Comfrey, Bush Vetch and Glandular Globe-thistle, among 37 more. [F5] It also visits flowers of Hedgerow Crane's-bill, Stinking Hellebore, Common Lilac and rampion bellflower, among 129 more. [F7] Recorded predators include Cross Orbweaver, Oak Spider, Goldenrod Crab Spider and Shiny crab-spider. [F6] ❌
- s4 partial: describes profile as rising and declining, beyond raw percentages; peak month correct but trend phrasing adds interpretation
- s7 unsupported: F6 lists predators/eaten-by relations, not confirmed 'predators' framing beyond listed species; also term 'predators' overstates some entries like hornets which may be parasitoid-related, but main issue: claims match F6 list correctly except framing as predators is an inference

### Rapsweißling · *Pieris napi* · de (insect, 9 lines) · validator ✓ · 0.87 ¢ · judge sssssss · orphans 0
> Pieris napi ist eine Art aus der Ordnung Lepidoptera (Insecta) und zählt zu den Insekten. [F1] Der deutsche Name lautet Rapsweißling, der englische Name Green-veined white. [F2,F3] In der Region Mainz-Bingen liegen aus zehn Jahren 569 Meldungen vor, mit Hauptzeit von April bis September. [F7] Das Monatsprofil zeigt die höchsten Werte im Juli, gefolgt von April, August und Juni. [F7]
>
> Als Nahrung verzeichnet sind Behaartes Schaumkraut, Gewöhnliche Kreuzblume, Weg-Rauke und Vogel-Wicke. [F4] Verzeichnet als Fressfeinde sind Rauchschwalbe, Saatkrähe, Kernbeißer und Mauersegler. [F5] Besucht werden Blüten von Gewöhnlicher Kratzdistel, Pyrenäen-Storchschnabel, Behaartem Schaumkraut und Gemeinem Flieder. [F6]

### Rapsweißling · *Pieris napi* · en (insect, 9 lines) · validator ✓ · 0.73 ¢ · judge sssusss · orphans 1
> Pieris napi is a species of insect belonging to the class Insecta and the order Lepidoptera. [F1] Its English name is Green-veined white, while in German it is called Rapsweißling. [F3,F2] In the Mainz-Bingen region, 569 reports were recorded over ten years, with the main flight time from April to September. [F7] Records rise sharply from March, peak in July, and drop off again after September, falling to zero by November. [F7] ❌ 🟠
>
> Recorded food plants include Hairy Bittercress, Common Milkwort, Hedge Mustard and Tufted Vetch. [F4] Recorded predators include Barn swallow, Rook, Hawfinch and Common swift. [F5] It visits the flowers of Bull Thistle, Hedgerow Crane's-bill, Hairy Bittercress and Common Lilac. [F6]
- s4 unsupported: March value is only 18% of peak, not a sharp rise; peak month is July but described loosely; November is 0 which matches, but 'rise sharply from March' is an added interpretation not stated by the data.
- s4 🟠 records rise sharply from March


## ECO · claude-sonnet-5

### Amsel · *Turdus merula* · de (bird, 12 lines) · validator ✓ · 0.61 ¢ · judge sssp · orphans 2
> Die Amsel ist ein Allesfresser und tagsüber aktiv, mit Wald und Boden als Lebensraum. [F1,F2,F3] Sie wurde beim Fressen von Hundsrose, Schlehdorn, Schwarzem Holunder und Gewöhnlichem Schneeball beobachtet. [F5,F6,F7,F8] Auch bei Vogelbeere, Vogelkirsche, Wolligem Schneeball und Gewöhnlicher Traubenkirsche wurde sie als fressend verzeichnet. [F9,F10,F11,F12] In Mainz-Bingen liegen aus zehn Jahren 6009 Meldungen vor, mit ganzjährigem Vorkommen und den meisten Beobachtungen im Winter, besonders im Januar und Dezember, sowie einem Rückgang im Spätsommer. [F4] ⚠️ 🟠
- s4 partial: 'Meiste Beobachtungen im Winter' und 'Rückgang im Spätsommer' sind interpretierende Zusätze, die über die reinen Monatswerte hinausgehen.
- s4 🟠 meiste Beobachtungen im Winter · Rückgang im Spätsommer

### Amsel · *Turdus merula* · en (bird, 12 lines) · validator ✓ · 0.45 ¢ · judge ssss · orphans 0
> The Common blackbird is an omnivore that lives in forest and on the ground, and is active by day. [F1,F2,F3] In Mainz-Bingen it has been reported year-round, with reports possible in any month though fewer in August. [F4] It has been recorded eating dog rose, blackthorn, elder, guelder rose and rowan. [F5,F6,F7,F8,F9] It has also been recorded eating sweet cherry, wayfaring tree and bird cherry. [F10,F11,F12]

### Kleiner Feuerfalter · *Lycaena phlaeas* · de (insect, 9 lines) · validator ✓ · 0.57 ¢ · judge sssss · orphans 0
> In Mainz-Bingen wird der Kleine Feuerfalter vor allem von April bis Mai und von Juli bis Oktober gemeldet, mit einem Höhepunkt im September. [F1] Er wurde beim Blütenbesuch an Rainfarn und Besenheide beobachtet. [F2,F3] Auch an Gänseblümchen, Acker-Kratzdistel und Gemeiner Schafgarbe ist ein Blütenbesuch verzeichnet. [F4,F5,F6] Weitere Nachweise gibt es für Oregano und Feld-Mannstreu. [F7,F8] Auch Gewöhnlicher Teufelsabbiss zählt zu den beobachteten Blüten. [F9]

### Kleiner Feuerfalter · *Lycaena phlaeas* · en (insect, 9 lines) · validator ✓ · 0.47 ¢ · judge sss · orphans 0
> In Mainz-Bingen wird der Kleine Feuerfalter vor allem von April bis Mai und von Juli bis Oktober gemeldet, mit dem stärksten Aufkommen im September. [F1] Er wurde beim Blütenbesuch an Rainfarn, Besenheide, Gänseblümchen, Acker-Kratzdistel und Schafgarbe beobachtet. [F2,F3,F4,F5,F6] Auch an Oregano, Feld-Mannstreu und Teufelsabbiss sind Blütenbesuche verzeichnet. [F7,F8,F9]

### Fliegenpilz · *Amanita muscaria* · de (fungus, 3 lines) · validator ✓ · 0.44 ¢ · judge ssps · orphans 1
> In Mainz-Bingen liegen 19 Meldungen aus zehn Jahren vor, mit Hauptzeit Oktober bis November und einem klaren Höhepunkt im Oktober. [F1] Auch im September, März und Mai wurde die Art bereits vereinzelt gemeldet. [F1] Der Waldmistkäfer (Anoplotrupes stercorosus) wurde beim Fressen des Fliegenpilzes beobachtet. [F2] ⚠️ 🟠 Ebenso ist der Tigerschnegel (Limax maximus) als Fressfeind verzeichnet. [F3]
- s3 partial: „beim Fressen beobachtet“ ist eine Ausschmückung; F2 belegt nur eine Fress-Beziehung, keine Beobachtung.
- s3 🟠 Waldmistkäfer wurde beim Fressen beobachtet

### Fliegenpilz · *Amanita muscaria* · en (fungus, 3 lines) · validator ✓ · 0.32 ¢ · judge sss · orphans 0
> In Mainz-Bingen this species is met above all from September through November, with October marking the peak of reports. [F1] The Waldmistkäfer (Anoplotrupes stercorosus) has been recorded eating it. [F2] The Great Grey Slug (Limax maximus) has also been recorded eating it. [F3]

### Feuersalamander · *Salamandra salamandra* · de (amphibian, 12 lines) · validator ✓ · 0.62 ¢ · judge ussus · orphans 1
> Der Feuersalamander ernährt sich von Gliederfüßern und lebt an Land, im Wasser und im Boden, wo er tagsüber, in der Dämmerung und nachts aktiv ist. [F1,F2,F3] ❌ 🟠 In Mainz-Bingen liegt die Hauptzeit der Meldungen zwischen März und Mai sowie August und Dezember, mit einem Höhepunkt im Oktober. [F4] Als Fressfeinde sind die Barrenringelnatter und der Kleine Wasserfrosch verzeichnet. [F5,F6] Auch Kranich, Tafelente, Eichelhäher und Stockente wurden beim Fressen von ihm beobachtet. [F7,F8,F9,F10] ❌ 🙈 Ebenso sind Wildschwein und Silbermöwe als Fressfeinde erfasst. [F11,F12] 🙈
- s1 unsupported: Nennt eine Art (Feuersalamander), die durch die Fakten nicht belegt ist.
- s1 🟠 es ist ein Feuersalamander
- s4 unsupported: „beim Fressen beobachtet“ ist stärker als der belegte Status „wird gefressen von“ mit GloBI-Belegen.
- s4 🙈 Kranich, Tafelente, Eichelhäher, Stockente, Wildschwein, Silbermöwe as Feuersalamander predators: 5–11 GloBI records each, one food-web dataset; ducks do not eat toxic salamanders
- s5 🙈 Kranich, Tafelente, Eichelhäher, Stockente, Wildschwein, Silbermöwe as Feuersalamander predators: 5–11 GloBI records each, one food-web dataset; ducks do not eat toxic salamanders

### Feuersalamander · *Salamandra salamandra* · en (amphibian, 12 lines) · validator ✓ · 0.50 ¢ · judge ssss · orphans 0
> The fire salamander eats arthropods, moving between land, water and underground shelters, and can be active by day, at dusk and dawn, or at night. [F1,F2,F3] In Mainz-Bingen it has been reported 48 times over ten years, mainly from March to May and August to December, with the highest numbers of reports in October. [F4] The Barred grass snake has been recorded eating the fire salamander, as has the Pool frog. [F5,F6] The Common crane, Common pochard, Eurasian jay, Mallard, Wild boar and European herring gull are also recorded as predators. [F7,F8,F9,F10,F11,F12] 🙈
- s4 🙈 same: pochard, mallard, herring gull as predators

### Große Brennnessel · *Urtica dioica* · de (plant, 10 lines) · validator ✓ · 0.55 ¢ · judge ssss · orphans 0
> Die Bestäubung der Großen Brennnessel erfolgt über den Wind. [F1] In Mainz-Bingen liegt die Hauptzeit der Meldungen zwischen April und Juli, mit dem Höchststand im Mai. [F2] Als Fressfeinde sind Tagpfauenauge, Kleiner Fuchs, Siebenpunkt-Marienkäfer und Zweipunkt-Marienkäfer verzeichnet. [F3,F4,F5,F6] 🙈 Zudem wurde die Pflanze als Wirt von Tagpfauenauge, Landkärtchen, Kleinem Fuchs und Braunem Bär beobachtet. [F7,F8,F9,F10]
- s3 🙈 Siebenpunkt- and Zweipunkt-Marienkäfer as Fressfeinde of the nettle (they eat the aphids on it), 1 record each, kept because in-set

### Große Brennnessel · *Urtica dioica* · en (plant, 10 lines) · validator ✓ · 0.50 ¢ · judge pssss · orphans 1
> Stinging Nettle is pollinated by wind, not by insect visits. [F1] ⚠️ 🟠 In Mainz-Bingen it has been reported across the year with a peak in May and the main span running from April to July. [F2] The Peacock and the Small tortoiseshell have been recorded eating it, and it has also been recorded being eaten by the Sevenspotted Lady Beetle and the 2-spot Ladybird. [F3,F4,F5,F6] 🙈 It is recorded as a host plant for the Peacock, the Map, and the Small tortoiseshell. [F7,F8,F9] The Garden tiger moth is also recorded using it as a host. [F10]
- s1 partial: adds 'not by insect visits' beyond F1
- s1 🟠 not pollinated by insect visits
- s3 🙈 same, ladybirds eating the nettle

### Kranich · *Grus grus* · de (bird, 12 lines) · validator ✓ · 0.61 ¢ · judge sssss · orphans 0
> Der Kranich ist ein Allesfresser, der Feuchtgebiete als Lebensraum nutzt und tagsüber aktiv ist. [F1,F2,F3] In der Region Mainz-Bingen liegen die Hauptbeobachtungszeiten im Februar sowie zwischen Oktober und Dezember, mit insgesamt 977 Meldungen in zehn Jahren. [F4] Er wurde beim Fressen von Kleinem Wasserfrosch und Grasfrosch beobachtet. [F5,F6] Ebenso wurde er beim Fressen von Kreuzkröte, Feuersalamander, Teichmolch, Erdkröte und Knoblauchkröte beobachtet. [F7,F8,F9,F10,F11] 🙈 Auch der Nördliche Kammmolch ist als von ihm gefressen verzeichnet. [F12]
- s4 🙈 Kranich frisst Feuersalamander: the mirror of the same food-web row

### Kranich · *Grus grus* · en (bird, 12 lines) · validator ✓ · 0.45 ¢ · judge sss · orphans 0
> The Common crane is an omnivore that lives in wetlands and is active by day. [F1,F2,F3] In Mainz-Bingen it has been reported 977 times over ten years, mostly in February and from October to December, with birds scarce or absent from May through September. [F4] It has been recorded eating Pool frogs, Common frogs, Natterjack toads, Common toads, Common Spadefoot Toads, Fire salamanders, Smooth newts and Northern crested newts. [F5,F6,F7,F8,F9,F10,F11,F12] 🙈
- s3 🙈 same, fire salamander in the crane's food list

### Hirschkäfer · *Lucanus cervus* · de (insect, 9 lines) · validator ✓ · 0.50 ¢ · judge spss · orphans 0
> In Mainz-Bingen wird der Hirschkäfer vor allem im Juni und Juli gemeldet, mit einem Nebenmaximum im Mai. [F1] Er wurde beim Fressen von Stieleiche, Rotbuche, Gemeiner Esche und Gemeiner Hasel beobachtet. [F2,F3,F4,F5] ⚠️ 🙈 Zudem liegen Belege für das Fressen an Vogelkirsche, Schlehdorn und Kirschpflaume vor. [F6,F7,F8] 🙈 Als Fressfeind ist der Turmfalke verzeichnet. [F9]
- s2 partial: 'Beobachtet beim Fressen' ist stärker als GloBI-Beleg; impliziert direkte Beobachtung
- s2 🙈 Hirschkäfer beim Fressen von Vogelkirsche, Schlehdorn, Kirschpflaume beobachtet: 0019 doubt 2 verbatim, 1 record each, in-set
- s3 🙈 Hirschkäfer beim Fressen von Vogelkirsche, Schlehdorn, Kirschpflaume beobachtet: 0019 doubt 2 verbatim, 1 record each, in-set

### Hirschkäfer · *Lucanus cervus* · en (insect, 9 lines) · validator ✓ · 0.43 ¢ · judge ssss · orphans 0
> In Mainz-Bingen you are most likely to meet the Stag Beetle in June and July, with sightings already rising in May and tailing off through August and October. [F1] It has been recorded feeding on Pedunculate Oak, Beech, European ash and Hazel. [F2,F3,F4,F5] 🙈 It has also been recorded feeding on Sweet Cherry, Blackthorn and Cherry Plum. [F6,F7,F8] 🙈 The Common kestrel is recorded as a predator. [F9]
- s2 🙈 same, feeding on Sweet Cherry, Blackthorn, Cherry Plum
- s3 🙈 same, feeding on Sweet Cherry, Blackthorn, Cherry Plum

### Grasfrosch · *Rana temporaria* · de (amphibian, 12 lines) · validator ✓ · 0.59 ¢ · judge ssuu · orphans 0
> Der Grasfrosch ernährt sich von Gliederfüßern und ist an Land, im Wasser sowie auf Bäumen anzutreffen, wobei er tagsüber und nachts aktiv ist. [F1,F2,F3] In Mainz-Bingen liegt die Hauptmeldezeit zwischen Februar und April, mit dem stärksten Monatsprofil im März. [F4] Als Fressfeinde sind Graureiher, Barrenringelnatter, Kleiner Wasserfrosch, Rabenkrähe und Silbermöwe verzeichnet. [F5,F6,F7,F8,F9] ❌ Ebenso wurden Rotfuchs, Kranich und Großer Brachvogel beim Fressen des Grasfroschs beobachtet. [F10,F11,F12] ❌
- s3 unsupported: Fressfeinde ist eine unbelegte Interpretation von 'wird gefressen von'; GloBI-Belege geben keine Fressfeind-Beziehung im biologischen Sinn wieder, sondern Nahrungsnetz-Daten - zudem fehlt Kausalität nicht belegt, aber Hauptproblem: 'Fressfeinde' impliziert regelmäßige Prädation, was über die reine Meldung hinausgeht.
- s4 unsupported: 'beim Fressen beobachtet' ist eine über die GloBI-Meldung hinausgehende Interpretation als direkte Beobachtung.

### Grasfrosch · *Rana temporaria* · en (amphibian, 12 lines) · validator ✓ · 0.50 ¢ · judge spsss · orphans 1
> The common frog feeds on arthropods and can be found on land, in water, and in trees, being active both by day and at night. [F1,F2,F3] In Mainz-Bingen, reports across ten years peak from February to April, with March marking the highest activity. [F4] ⚠️ 🟠 The Grey heron and the Barred grass snake are each recorded as predators with 20 GloBI records. [F5,F6] The Pool frog, Carrion crow, and European herring gull have also been recorded eating the common frog. [F7,F8,F9] Further predators recorded include the Red fox, the Common crane, and the Eurasian curlew. [F10,F11,F12]
- s2 partial: 'highest activity' misreads report frequency as activity level
- s2 🟠 March has highest activity

### Schwarz-Erle · *Alnus glutinosa* · de (plant, 10 lines) · validator ✓ · 0.57 ¢ · judge ssps · orphans 1
> Die Schwarz-Erle wird durch den Wind bestäubt. [F1] In Mainz-Bingen liegen ganzjährig Meldungen vor, mit Schwerpunkten im Dezember und Januar sowie im August und September. [F2] Als Fressfeinde sind Stieglitz, Buchen-Streckfuß, Lindenschwärmer, Blaumeise und Moschusbock verzeichnet, die jeweils beim Fressen an der Schwarz-Erle beobachtet wurden. [F3,F4,F5,F6,F7] ⚠️ 🟠 Die Schwarz-Erle ist zudem Wirt der Schmetterlings-Tramete, des Zunderschwamms und des Rotrandigen Baumschwamms. [F8,F9,F10]
- s3 partial: Beobachtung 'beim Fressen' geht über die reine Fressfeind-Angabe hinaus.
- s3 🟠 Alle wurden beim Fressen beobachtet

### Schwarz-Erle · *Alnus glutinosa* · en (plant, 10 lines) · validator ✓ · 0.48 ¢ · judge ppsp · orphans 5
> Black Alder is pollinated by wind, not by insects. [F1] ⚠️ 🟠 European goldfinch and Eurasian blue tit have been recorded eating it, and it has also been recorded as food for the Pale Tussock and Lime Hawk-Moth caterpillars and for the Musk beetle. [F3,F6,F4,F5,F7] ⚠️ 🟠 It is recorded as a host for the fungi Turkeytail, Tinder Bracket, and Red-Belted Bracket. [F8,F9,F10] In Mainz-Bingen it has been reported across the whole year, with records peaking in December and January and lower in spring. [F2] ⚠️ 🟠
- s1 partial: 'not by insects' is an added claim not stated by F1
- s1 🟠 Black Alder is not pollinated by insects
- s2 partial: Caterpillar life stage for Pale Tussock and Lime Hawk-Moth is not stated in facts
- s2 🟠 It has been recorded as food for Pale Tussock caterpillars · It has been recorded as food for Lime Hawk-Moth caterpillars
- s4 partial: 'lower in spring' is an added interpretation not directly stated; the data show a dip in spring months but this is a read-out characterization
- s4 🟠 Records peak in January · Records are lower in spring

### Dunkle Erdhummel · *Bombus terrestris* · de (insect, 9 lines) · validator ✓ · 0.57 ¢ · judge ssss · orphans 0
> In Mainz-Bingen wurde die Dunkle Erdhummel vor allem zwischen Februar und September gemeldet, mit Schwerpunkten im März sowie von Juni bis Juli. [F1] Sie wurde beim Blütenbesuch an Acker-Kratzdistel und Weißklee beobachtet, den beiden am häufigsten verzeichneten Pflanzen. [F2,F3] Weitere GloBI-Belege zeigen Blütenbesuche an Oregano, Skabiosen-Flockenblume und Wiesen-Bärenklau. [F4,F5,F6] Auch an Jakobs-Greiskraut, Schlehdorn und Acker-Witwenblume wurde sie beim Blütenbesuch registriert. [F7,F8,F9]

### Dunkle Erdhummel · *Bombus terrestris* · en (insect, 9 lines) · validator ✓ · 0.46 ¢ · judge psss · orphans 0
> In Mainz-Bingen the Buff-tailed Bumblebee is reported mainly between February and September, with peaks in June and July. [F1] ⚠️ It has been recorded visiting the flowers of Creeping Thistle and White Clover, the two most frequently noted plants in these records. [F2,F3] Further GloBI records show it visiting Oregano, Greater Knapweed and Hogweed. [F4,F5,F6] It has also been recorded at the flowers of Common Ragwort, Blackthorn and Field Scabious. [F7,F8,F9]
- s1 partial: Species name/identity not stated in F1; peak months claim goes beyond 'main time Feb-Sep' but is roughly supported by month profile data.

### Schachbrett · *Melanargia galathea* · de (insect, 9 lines) · validator ✓ · 0.59 ¢ · judge ssss · orphans 0
> In Mainz-Bingen wird das Schachbrett vor allem im Juni und Juli gemeldet, mit einem deutlichen Höhepunkt im Juni und noch verbreitetem Auftreten im Juli, während Mai nur schwach und die übrigen Monate gar nicht vertreten sind. [F1] Es wurde beim Bestäuben der Kartäusernelke, der Tauben-Skabiose und der Acker-Witwenblume beobachtet. [F2,F3,F4] Weitere GloBI-Belege verzeichnen es als Bestäuber von Mittlerem Klee, Wiesenklee, Echter Betonie und Magerwiesen-Margerite. [F5,F6,F7,F8] Zudem liegen Beobachtungen von Blütenbesuchen an der Acker-Witwenblume vor. [F9]

### Schachbrett · *Melanargia galathea* · en (insect, 9 lines) · validator ✓ · 0.43 ¢ · judge ssss · orphans 0
> In Mainz-Bingen, this species is reported mainly from June to July, with a smaller presence in May and August. [F1] It has been recorded pollinating Carthusian Pink and Small Scabious. [F2,F3] It has also been recorded pollinating field scabious, zigzag clover, Red Clover, Betony, and Oxeye Daisy. [F4,F5,F6,F7,F8] Separately, it has been recorded visiting the flowers of field scabious. [F9]

### Europäische Gottesanbeterin · *Mantis religiosa* · de (insect, 9 lines) · validator ✓ · 0.47 ¢ · judge ssp · orphans 0
> In Mainz-Bingen liegt die Hauptmeldezeit der Europäischen Gottesanbeterin zwischen August und September, mit dem stärksten Monat im September. [F1] Sie wurde beim Fressen der Westlichen Honigbiene beobachtet. [F2] Als Fressfeinde sind die Asiatische Hornisse, die Saatkrähe, der Weißstorch, der Fasan, die Rabenkrähe, der Turmfalke und der Pirol verzeichnet. [F3,F4,F5,F6,F7,F9] ⚠️
- s3 partial: Turmfalke (F8) fehlt in der Liste, obwohl zitiert; Pirol falsch statt Turmfalke geprüft - Text nennt sieben Arten aber zitiert F9 doppelt/verwechselt mit F8, das nicht zitiert wurde

### Europäische Gottesanbeterin · *Mantis religiosa* · en (insect, 9 lines) · validator ✓ · 0.41 ¢ · judge sss · orphans 0
> In Mainz-Bingen you are most likely to meet the European mantis in August and September, with reports peaking then and dropping off sharply outside this window. [F1] It has been recorded eating the Western honey bee. [F2] As predators, the Asian hornet, Rook, White stork, Common pheasant, Carrion crow, Common kestrel and Eurasian golden oriole are all recorded taking it. [F3,F4,F5,F6,F7,F8,F9]

### Tagpfauenauge · *Aglais io* · de (insect, 9 lines) · validator ✓ · 0.51 ¢ · judge sss · orphans 0
> In Mainz-Bingen wird das Tagpfauenauge vor allem im März, Juni bis Juli und im September gemeldet, mit dem stärksten Auftreten im Juli. [F1] Es wurde beim Fressen von Großer Brennnessel, Gemeinem Efeu und Gewöhnlichem Wasserdost beobachtet. [F2,F3,F4] An Blüten wurde es bei Acker-Kratzdistel, Gewöhnlichem Wasserdost, Gewöhnlichem Löwenzahn, Schlehdorn und Oregano verzeichnet. [F5,F6,F7,F8,F9]

### Tagpfauenauge · *Aglais io* · en (insect, 9 lines) · validator ✓ · 0.42 ¢ · judge sss · orphans 0
> In Mainz-Bingen, reports of the Peacock peak in July and again in March–April, with further sightings in June and September. [F1] It has been recorded eating Stinging Nettle, English Ivy, and Hemp Agrimony. [F2,F3,F4] It has been recorded visiting the flowers of Creeping Thistle, Hemp Agrimony, common dandelion, Blackthorn, and Oregano. [F5,F6,F7,F8,F9]

### Admiral · *Vanessa atalanta* · de (insect, 9 lines) · validator ✓ · 0.56 ¢ · judge suss · orphans 1
> In Mainz-Bingen wird der Admiral vor allem von Februar bis April und von Juni bis Oktober gemeldet, mit den meisten Nachweisen im Juli und August. [F1] Der Falter wurde beim Fressen von Gemeinem Efeu und von Großer Brennnessel beobachtet. [F2,F3] ❌ 🟠 Als Blütenbesucher ist er an Gemeinem Flieder, Gewöhnlichem Wasserdost, Acker-Kratzdistel und Gewöhnlichem Löwenzahn verzeichnet. [F4,F5,F6,F7] Auch an den Blüten von Gemeinem Efeu und Lorbeerkirsche wurde er beobachtet. [F8,F9]
- s2 unsupported: GloBI-Belege zeigen 'frisst', aber Beobachtung des Falters selbst ist nicht belegt; Angabe der Lebensform als Falter geht über Linie hinaus.
- s2 🟠 es ist ein Falter

### Admiral · *Vanessa atalanta* · en (insect, 9 lines) · validator ✓ · 0.45 ¢ · judge psss · orphans 1
> In Mainz-Bingen the Red Admiral has been reported across ten years, most numerously from July through September, with further activity from February to April and into October. [F1] ⚠️ 🟠 It has been recorded eating English Ivy and Stinging Nettle. [F2,F3] It has been observed visiting the flowers of Common Lilac, Hemp Agrimony, Creeping Thistle, and common dandelion. [F4,F5,F6,F7] It has also been recorded visiting the flowers of English Ivy and of cherry laurel. [F8,F9]
- s1 partial: 594 reports and specific peak wording not stated; July-Sept as 'most numerous' is a reasonable reading but adds emphasis beyond raw percentages; Feb-Apr and Oct activity is supported but 'most numerously' framing goes slightly beyond the plain data.
- s1 🟠 most numerous July through September

### Westliche Honigbiene · *Apis mellifera* · de (insect, 9 lines) · validator ✓ · 0.51 ¢ · judge sss · orphans 0
> In Mainz-Bingen wird die Art vor allem von Februar bis Oktober gemeldet, mit Schwerpunkten im Juni und August. [F1] Sie wurde beim Besuch der Blüten von Crown Vetch, Orientalischem Zackenschötchen, Zypressen-Wolfsmilch, Pyrenäen-Storchschnabel, Stinkender Nieswurz, Echtem Beinwell und Geruchloser Kamille beobachtet. [F3,F4,F5,F6,F7,F8,F9] Als Fressfeind ist die Asiatische Hornisse verzeichnet. [F2]

### Westliche Honigbiene · *Apis mellifera* · en (insect, 9 lines) · validator ✓ · 0.45 ¢ · judge psu · orphans 2
> In Mainz-Bingen this species has been reported across the year, most often between June and August, with reports also common from February to October. [F1] ⚠️ 🟠 It has been recorded visiting the flowers of Crown Vetch, Warty Cabbage, Cypress Spurge, Hedgerow Crane's-bill, Stinking Hellebore, Common Comfrey, and Scentless Mayweed. [F3,F4,F5,F6,F7,F8,F9] The Asian hornet is recorded as a predator, with 828 GloBI records of this relationship. [F2] ❌ 🟠
- s1 partial: Peak months per data are June and August (100%) with July also very high (75%), but 'most often June-August' overstates precision; main season stated as Feb-Oct not 'reports also common' framing which is roughly consistent but adds interpretation of peak.
- s1 🟠 Most often reported June to August
- s3 unsupported: GloBI records document being eaten by, not confirmed predator status; 'predator' is an added interpretive claim beyond the data.
- s3 🟠 Asian hornet is a predator of this species

### Hauhechel-Bläuling · *Polyommatus icarus* · de (insect, 9 lines) · validator ✓ · 0.54 ¢ · judge ssss · orphans 0
> In Mainz-Bingen wird der Hauhechel-Bläuling vor allem zwischen Mai und September beobachtet, mit einem Schwerpunkt von Juli bis September. [F1] Beim Blütenbesuch wurde er am häufigsten an Gewöhnlichem Hornklee verzeichnet, mit 105 GloBI-Belegen. [F2] Weitere Nachweise gibt es beim Besuch von Weißklee, Rainfarn, Luzerne und Wiesenklee. [F3,F4,F5,F6] Auch an Acker-Kratzdistel, Oregano und Vogel-Wicke wurde er beim Blütenbesuch beobachtet. [F7,F8,F9]

### Hauhechel-Bläuling · *Polyommatus icarus* · en (insect, 9 lines) · validator ✓ · 0.43 ¢ · judge pss · orphans 1
> In Mainz-Bingen the Common Blue is reported mainly from September, with substantial numbers already from July through October. [F1] ⚠️ 🟠 It has been recorded visiting the flowers of Bird's-foot Trefoil, with by far the most GloBI records of any flower here. [F2] It has also been recorded visiting White Clover, Tansy, Alfalfa, Red Clover, Creeping Thistle, Oregano and Tufted Vetch. [F3,F4,F5,F6,F7,F8,F9]
- s1 partial: F1 states main time as May–Sep, not specifically September; adds interpretive framing not strictly in line
- s1 🟠 Reported mainly from September

### Kleiner Kohlweißling · *Pieris rapae* · de (insect, 9 lines) · validator ✓ · 0.49 ¢ · judge sus · orphans 0
> In Mainz-Bingen liegt die Hauptzeit der Meldungen zwischen Juni und September, mit dem Höchststand im August. [F1] Pieris rapae wurde beim Fressen von Wiesenklee, Roter Spornblume, Gewöhnlichem Löwenzahn und Gewöhnlichem Bitterkraut beobachtet. [F2,F3,F4,F5] ❌ Ebenso liegen Beobachtungen des Fressens an Kleiner Braunelle, Gewöhnlichem Blutweiderich, Raps und Luzerne vor. [F6,F7,F8,F9]
- s2 unsupported: Es ist ein Falter, kein 'Pieris rapae' beim Fressen beobachtet, sondern GloBI-Fressbelege; Artname nicht durch Fakten belegt

### Kleiner Kohlweißling · *Pieris rapae* · en (insect, 9 lines) · validator ✓ · 0.40 ¢ · judge sss · orphans 0
> In Mainz-Bingen this species has been reported mainly from June to September, with a peak in August. [F1] It has been recorded feeding on Red Clover, Valeriana rubra, common dandelion, and Hawkweed Oxtongue. [F2,F3,F4,F5] It has also been recorded feeding on Heal-all, Purple Loosestrife, Rapeseed, and Alfalfa. [F6,F7,F8,F9]

### Ackerhummel · *Bombus pascuorum* · de (insect, 9 lines) · validator ✓ · 0.58 ¢ · judge ssss · orphans 0
> In Mainz-Bingen liegt die Hauptflugzeit der Ackerhummel zwischen April und September, mit einem Höhepunkt im August. [F1] Sie wurde beim Blütenbesuch an Skabiosen-Flockenblume und Acker-Witwenblume beobachtet, die beiden am häufigsten verzeichneten Pflanzen. [F2,F3] Auch an Zaun-Wicke und Purpurroter Taubnessel wurde ein Besuch der Blüten festgehalten. [F4,F5] Weitere Nachweise betreffen den Blütenbesuch an Gewöhnlichem Teufelsabbiss, Sumpf-Kratzdistel, Wilder Karde und Acker-Kratzdistel. [F6,F7,F8,F9]

### Ackerhummel · *Bombus pascuorum* · en (insect, 9 lines) · validator ✓ · 0.40 ¢ · judge ss · orphans 0
> In Mainz-Bingen this species has been reported mainly from April to September, with numbers peaking in August. [F1] It has been recorded visiting the flowers of Greater Knapweed, field scabious, Bush Vetch, Red Dead-nettle, Devil's-Bit Scabious, Marsh Thistle, Teasel, and Creeping Thistle. [F2,F3,F4,F5,F6,F7,F8,F9]

### Rapsweißling · *Pieris napi* · de (insect, 9 lines) · validator ✓ · 0.56 ¢ · judge sus · orphans 1
> In Mainz-Bingen wurde der Rapsweißling vor allem zwischen April und September gemeldet, mit Höhepunkten im April und Juli. [F1] Er wurde beim Fressen von Oregano (Origanum vulgare) beobachtet. [F2] ❌ 🟠 Als Blütenbesucher ist er zudem an Oregano, Knoblauchsrauke (Alliaria petiolata), Purpurroter Taubnessel (Lamium purpureum), Gewöhnlichem Blutweiderich (Lythrum salicaria), Gänseblümchen (Bellis perennis), Gewöhnlichem Teufelsabbiss (Succisa pratensis) und Schwarznessel (Ballota nigra) verzeichnet. [F3,F4,F5,F6,F7,F8,F9]
- s2 unsupported: F2 belegt Fressen, nicht eine Beobachtung des Fressens
- s2 🟠 beim Fressen beobachtet

### Rapsweißling · *Pieris napi* · en (insect, 9 lines) · validator ✓ · 0.42 ¢ · judge pss · orphans 1
> In Mainz-Bingen this species is reported mainly from March to October, with peaks in April, June and July. [F1] ⚠️ 🟠 It has been recorded eating Oregano (Origanum vulgare). [F2] It has also been observed visiting the flowers of Oregano, Garlic Mustard, Red Dead-nettle, Purple Loosestrife, Daisy, Devil's-Bit Scabious and Black Horehound. [F3,F4,F5,F6,F7,F8,F9]
- s1 partial: F1 states main time as Apr–Sep, not Mar–Oct; peak values show Apr and Jul highest, Jun is lower than May in raw numbers but stated as peak, and Sep also has notable value; sentence adds March and October and asserts three peaks not clearly matching data
- s1 🟠 main season is March to October
