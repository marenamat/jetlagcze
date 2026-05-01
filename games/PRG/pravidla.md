# JetLag Hide&Seek, pravidla pro Prahu

*Tento text vzniknul na základě původní hry
[JetLag Hide&Seek](https://store.nebula.tv/collections/jetlag/products/hideandseek)
a zkušeností z testovací hry v pátek 3. dubna 2026.
Na otázky, na které nenajdete odpověď zde, hledejte
odpověď v originálních pravidlech.*

*Změnu nebo doplnění pravidel navrhněte jako
[github issue](https://github.com/marenamat/jetlagcze/issues).*

## Herní plocha

Hraje se na území hlavního města Prahy dle hranic obce. Centrem schovacích zón
je [seznam vyjmenovaných zastávek](../../gtfs/prg-coords-short.md).
Okruh schovávání je 500 metrů od GPS souřadnic uvedených v seznamu.

Pohybujeme se pěšky a spoji PID, které jsou v zónách P, 0 a B na území hlavního
města Prahy, konkrétně vším, v čem platí
[jízdenka na 24 hodin pro Prahu](https://pid.cz/jizdne-a-tarif/). Explicitně **ne**hrajeme na zastávkách jako Tuchoměřice,Outlet (technicky v B pro jedinou linku, co tam staví, a mimo území Prahy). 

Autoritativní mapovou aplikací je [mapy.cz](https://mapy.cz), ale pokud existuje
k dané věci konkrétní seznam, má přednost ten.

## Příprava před hrou

Domluvit týmy, resp. hráče, je lepší dřív než v onen den na místě. Na sdílení
polohy obecně používáme Google Maps, a na jejich použití je potřeba mít
v mobilu přihlášený účet a mít protihráče v kontaktech.

Vhodné je, když všichni nasdílejí své kontakty do společného chatu nejpozději
večer předem, a zkusí začít sdílet polohu půl hodiny před startem se všemi
ostatními.

Sraz 7:45 na startovním místě. Hodí se zastřešené pro případ, že by pršelo.

## Start a konec

Finalizovat rozložení týmů.  Týmy fungují dobře buď jako 2 proti 2, nebo tři
samostatní hráči, kdy 2 spolu hledají a 1 se schovává.

Z krabice se vytáhnou jedny pravidla, bloček a tři kostky pro hledače,
zbytek krabice si nechají schovávači.

Všechny strany hodí trojicí kostek; kdo hodí nejvíc, ten převezme krabku
a začíná se schovávat.

Hra končí ve 21:00, pokud se hráčstvo nedohodne jinak.

Sraz v 7:45 [před cukrárnou ve Světozoru](https://mapy.com/s/pacejugape).

## Schovávání

Na schovávání má tým 60 minut od chvíle, kdy převzal krabku. Tento čas se
může posunout o dobu, po kterou z okruhu 1 kilometru (pěším pochodem, ne vzdušně)
od schovacího místa nejede žádný dosažitelný spoj; požadavek na posun uplatňuje
schovávající se strana ideálně v okamžiku, kdy zjistila, že tento problém
nastal, ne však později než 10 minut po začátku schovacího času.

**První kolo má čas zkrácený na 45 minut** kvůli dopravní dostupnosti centra města v porovnání s periferií.

Zpoždění MHD je součástí rizika volby trasy.

Ve chvíli, kdy schovací čas skončil, si tým musí zvolit nějakou
[zastávku ze seznamu](../../gtfs/prg-coords-short.md),
ke které to nemá dál než 500 metrů vzdušnou
čarou, a to bude následně referenční zastávka pro schovací oblast tohoto kola.

Na onu zastávku nemusí v době hry vůbec jet žádné spoje PID, jedná se primárně
o referenční bod.

Ve schovací zóně by měl být takový signál, aby se dalo rozumně odpovídat na otázky. Pokud schovanci zjistí, že signál v místě je skutečně mizerný, musí zvolit jinou vhodnou blízkou schovací zónu, do které se mohli legálně dostat, a případně výslovně updatovat již odeslané odpovědi na otázky. *Jedná se o pravidlo pro výjimečné případy. Nepoužívat, dokud to není opravdu nutné.*

## Hledání

Uplynutím schovacího času začíná čas hledací. Hledající strana posílá schovaným
[otázky](otazky.md), na které musí schovaní poslat adekvátní odpověď v určeném čase.

Schovaní za každou otázku zpravidla dostanou nějaké [karty](karty.md), které
můžou použít ke zpomalení hledajících.

Po dobu hledacího času se schovaná strana může volně pohybovat po celé schovací
oblasti, kterou tvoří okruh 500 metrů vzdušnou čarou od referenční zastávky.

Hledací čas končí ve chvíli, kdy hledající strana prokazatelně nalezla
schovanou stranu, nejpozději však 300 minut po začátku hledání.

Hledající strana má zakázané některé nástroje, jejichž použití by zjednodušilo
hledání k nehratelnosti. Především je **zcela zakázáno** cíleně procházet možné oblasti
pomocí nástrojů jako **Panorama nebo Google StreetView** a používat fotomapy.
Naopak je naprosto v pořádku použít libovolným způsobem jízdní řády a mapy bez fotek.

Více poznámek následuje u [fotootázek](otazky.md#dodatečné-poznámky-k-fotkám).

## Koncovka

Ve chvíli, kdy hledající strana vstoupila do schovací oblasti, nastala koncovka.
Schovana strana se od té chvíle nesmí pohybovat a musí se vyskytovat nanejvýš
tři metry od cesty, a to v oblasti veřejně legálně dostupné.

Cestou se rozumí:

- pojmenované ulice a zpevněné cesty (v mapy.cz plnou čarou)
- turisticky značené cesty (pěší i cyklo)
- cesty značené v mapy.cz černou dlouze-čárkovanou čarou za podmínky, že jsou
  v terénu zřetelně viditelné a průchozí.

Začátek koncovky se hledající straně neoznamuje, a pokud hledající strana schovací
oblast zase opustí, tak se koncovka přerušuje a schovaná strana se i může přesunout.
