# CP_Exam_Solution
Concurrent programming individaul task with nact.js + node solution

# Individuali užduotis sesijos metu - aktorių modelis

Programos duomenų failai tokie pat, kaip L1 ir L2 lab.  darbų, gautas rezultatųfailas — taip pat toks pat, kaip L1 ir L2 metu.  
Programa realizuojama naudojant JavaScript programavimo kalbą su node ir Nact biblioteką (išsiaiškinti naudojimo prin-cipus savarankiškai). Programos bibliotekų valdymui naudoti npm. Sukuriami tokie aktoriai (sukurti aktorių hierarchiją savarankiškai):
  • skirstytuvas — skirsto žinutes tarp kitų aktorių;
  • darbininkai (kiekis toks pat, kaip L1 ir L2 programose) — skaičiuoja pasirinktosfunkcijos rezultatą ir filtruoja duomenis;
  • rezultatų kaupiklis — saugo atfiltruotus rezultatus surikiuotame masyve;
  • spausdintojas — išvedinėja rezultatus į failą. Programa iš failo nuskaito duomenis, sukuria reikalingus aktorius ir skirstytuvui povieną persiunčia nuskaitytus duomenis. 

-Skirstytuvas privalo priimti tokias žinutes:
  • iš pagrindinio scenarijaus priima duomenis, perskaitytus iš failo — gavęs žinutę, ją persiunčia vienam iš darbininkų apdorojimui; reikia sugalvoti ir realizuoti darbų paskirstymo algoritmą.
  • iš darbininko priima apskaičiuotą rezultatą ir persiunčia jį rezultatų kaupikliui. Taip pat skirstytuvas darbo pabaigoje rezultatus, saugomus kaupiklyje, persiunčia spausdintojui. 
  
-Darbininkai priima žinutes iš skirstytuvo, apskaičiuoja funkcijos rezultatą ir jei jis tenkina pasirinktą kriterijų, persiunčia atgal skirstytuvui. 
-Rezultatų kaupiklis priima rezultatus ir juos saugo savo masyve. 
-Spausdintojas priima rezultatų masyvą ir jį spausdina lentele į failą. 

Visi procesai gali siuntinėti ir priimti daugiau žinučių, nei aprašyta — čia pateiktadalis komunikacijos tarp procesų, likusią dalį sugalvoti ir realizuoti savarankiškai. 

**Jei įrašas atitinka pasirinktą kriterijų, jo „kelionė“ turėtų būti tokia: failas -> pagrin-dinis scenarijus -> skirstytuvas -> darbininkas -> skirstytuvas -> rezultatų kaupiklis ->skirstytuvas -> spausdintojas. 
**Jei įrašas neatitinka kriterijaus, jo „kelionė“ užsibaigia darbininke, jis toliau nebesiunčiamas. Papildomas reikalavimas programai: programoje negali būti kintamųjų, tik funkcijos ir konstantos.  Rekomenduojama vietoj ciklų naudoti map ir forEach masyvų metodus; darbininkų sukūrimui gali būti naudojamas masyvas su skaičiais nuo 0 iki n.
