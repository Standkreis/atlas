# 📦 etl/data — the bulk trait files (handoff 0021 D3)

Read once per `facts` run by `../traits.ts`, joined on the binomial. Downloaded 2026-09-07; 8.5 MB, committed so a fill needs no figshare login. Every fact the job writes from a file carries the dataset's name, DOI and licence.

| File | Dataset · version | Source | Licence | Columns used |
| --- | --- | --- | --- | --- |
| `AVONET1_BirdLife.csv` | AVONET (Tobias et al. 2022, Ecol. Lett.), BirdLife taxonomy sheet of `AVONET Supplementary dataset 1.xlsx` exported to CSV | https://doi.org/10.6084/m9.figshare.16586228 | CC BY 4.0 | `Species1`, `Mass`, `Habitat`, `Migration`, `Trophic.Niche` |
| `BirdFuncDat.txt` | EltonTraits 1.0 (Wilman et al. 2014, Ecology), birds | https://doi.org/10.6084/m9.figshare.3559887 | CC0 1.0 | `Scientific`, `Nocturnal` |
| `MamFuncDat.txt` | EltonTraits 1.0, mammals | as above | CC0 1.0 | `Scientific`, `Diet-*`, `Activity-*`, `BodyMass-Value` |
| `PanTHERIA_1-0_WR05_Aug2008.txt` | PanTHERIA 1.0 (Jones et al. 2009, Ecology), Wilson & Reeder 2005 taxonomy | https://doi.org/10.1890/08-1494.1 (archive: https://esapubs.org/archive/ecol/E090/184/) | **unstated in the archive**; the figshare wrapper says CC BY 4.0. Used, marked on every fact, noted for the owner | `MSW05_Binomial`, `5-1_AdultBodyMass_g`, `13-1_AdultHeadBodyLen_mm` (`-999` = missing) |
| `AmphiBIO_v1.csv` | AmphiBIO v1 (Oliveira et al. 2017, Sci. Data) | https://doi.org/10.6084/m9.figshare.4644424 | CC BY 4.0 | `Species`, `Fos/Ter/Aqu/Arb`, `Leaves/Flowers/Seeds/Fruits/Arthro/Vert`, `Diu/Noc/Crepu`, `Body_size_mm` |

Not here: **GIFT** (plants) is an open API with no key, fetched by `../gift.ts` into `../.cache/`; no licence line on the API, attributed as "GIFT (Weigelt et al.)" on every fact. **Wikidata** (fungi, wingspans) is CC0. **xeno-canto** clips carry their own licence per recording.

Files are Latin-1 with CRLF as published; the reader handles quoted fields. Refresh: download the archive again, replace the file, re-run `npm run etl -- facts --force`.
