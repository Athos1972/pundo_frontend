# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: main.spec.ts >> E2E-08: Karten-Routing-Links >> popup dir=rtl for Arabic lang
- Location: e2e/main.spec.ts:421:7

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: locator.click: Test timeout of 30000ms exceeded.
Call log:
  - waiting for getByRole('button', { name: /خريطة|map/i })

```

# Page snapshot

```yaml
- generic [ref=e1]:
  - generic [ref=e2]:
    - generic [ref=e3]:
      - link "الرئيسية" [ref=e5] [cursor=pointer]:
        - /url: /
        - img [ref=e6]
        - text: الرئيسية
      - generic [ref=e9]:
        - searchbox "ابحث عن منتج أو متجر..." [active] [ref=e10]: cat
        - button "Search" [ref=e11]:
          - img [ref=e12]
      - generic [ref=e15]:
        - button "متوفر" [ref=e16]
        - button "بسعر فقط" [ref=e17]
        - button "أونلاين" [pressed] [ref=e18]
      - generic [ref=e19]:
        - generic [ref=e20]: النطاق
        - slider "النطاق" [ref=e21]: "50"
        - generic [ref=e22]: 50 كم
    - generic [ref=e23]:
      - generic [ref=e24]:
        - heading "المتاجر المحلية" [level=2] [ref=e25]
        - generic [ref=e28]:
          - paragraph [ref=e29]:
            - link "غطاء مشرفة صائد البذور للأقفاص" [ref=e30] [cursor=pointer]:
              - /url: /products/seed-catcher-cover-skirt-for-cages
          - generic [ref=e31]:
            - generic [ref=e32]: 6.00 EUR
            - link "Manjo Pet" [ref=e33] [cursor=pointer]:
              - /url: /shops/manjo-pet-087d8709
        - generic [ref=e36]:
          - paragraph [ref=e37]:
            - link "ACANA WILD PRAIRIE CAT 1,8KG" [ref=e38] [cursor=pointer]:
              - /url: /products/acana-acana-wild-prairie-cat-18kg
          - paragraph [ref=e39]: ACANA
          - generic [ref=e40]:
            - generic [ref=e41]: 35.00 EUR
            - link "Manjo Pet" [ref=e42] [cursor=pointer]:
              - /url: /shops/manjo-pet-087d8709
        - generic [ref=e45]:
          - paragraph [ref=e46]:
            - link "ACANA BOUNTIFUL CATCH 1.8 KG" [ref=e47] [cursor=pointer]:
              - /url: /products/acana-acana-bountiful-catch-1-8-kg
          - paragraph [ref=e48]: ACANA
          - generic [ref=e49]:
            - generic [ref=e50]: 32.00 EUR
            - link "Manjo Pet" [ref=e51] [cursor=pointer]:
              - /url: /shops/manjo-pet-087d8709
        - generic [ref=e54]:
          - paragraph [ref=e55]:
            - link "ORIJEN ORIGINAL CAT 1.8KG" [ref=e56] [cursor=pointer]:
              - /url: /products/orijen-orijen-original-cat-1-8kg
          - paragraph [ref=e57]: ORIJEN
          - generic [ref=e58]:
            - generic [ref=e59]: 43.00 EUR
            - link "Manjo Pet" [ref=e60] [cursor=pointer]:
              - /url: /shops/manjo-pet-087d8709
        - generic [ref=e63]:
          - paragraph [ref=e64]:
            - link "ACANA CAT FIRST FEAST CHICKEN 1.8 KG" [ref=e65] [cursor=pointer]:
              - /url: /products/acana-acana-cat-first-feast-chicken-1-8-kg
          - paragraph [ref=e66]: ACANA
          - generic [ref=e67]:
            - generic [ref=e68]: 32.00 EUR
            - link "Manjo Pet" [ref=e69] [cursor=pointer]:
              - /url: /shops/manjo-pet-087d8709
        - generic [ref=e72]:
          - paragraph [ref=e73]:
            - link "APPLAWS طعام القطط فيليه التونة مع سرطان البحر 70 G" [ref=e74] [cursor=pointer]:
              - /url: /products/applaws-applaws-cat-food-tuna-fillet-with-crab-70-g
          - paragraph [ref=e75]: APPLAWS
          - generic [ref=e76]:
            - generic [ref=e77]: 1.95 EUR
            - link "Manjo Pet" [ref=e78] [cursor=pointer]:
              - /url: /shops/manjo-pet-087d8709
        - generic [ref=e81]:
          - paragraph [ref=e82]:
            - link "ARQUIVET بيت القطة الكرز 40*40*50 CM" [ref=e83] [cursor=pointer]:
              - /url: /products/arquivet-arquivet-cat-house-cherry-40-40-50-cm
          - paragraph [ref=e84]: Arquivet
          - generic [ref=e85]:
            - generic [ref=e86]: 57.50 EUR
            - link "Manjo Pet" [ref=e87] [cursor=pointer]:
              - /url: /shops/manjo-pet-087d8709
        - generic [ref=e90]:
          - paragraph [ref=e91]:
            - link "باخوس للقطط والكلاب الهدوء والشجاعة 60 قرص" [ref=e92] [cursor=pointer]:
              - /url: /products/bachus-for-cats-dogs-calm-brave-60-tables
          - generic [ref=e93]:
            - generic [ref=e94]: 27.00 EUR
            - link "Manjo Pet" [ref=e95] [cursor=pointer]:
              - /url: /shops/manjo-pet-087d8709
        - generic [ref=e98]:
          - paragraph [ref=e99]:
            - link "باخوس للقطط والكلاب الشعر والجلد 60 قرص" [ref=e100] [cursor=pointer]:
              - /url: /products/bachus-bachus-for-cats-dogs-hair-skin-60tables
          - paragraph [ref=e101]: BACHUS
          - generic [ref=e102]:
            - generic [ref=e103]: 28.00 EUR
            - link "Manjo Pet" [ref=e104] [cursor=pointer]:
              - /url: /shops/manjo-pet-087d8709
        - generic [ref=e107]:
          - paragraph [ref=e108]:
            - link "باخوس للقطط والكلاب الكبد والهضم 60 قرص" [ref=e109] [cursor=pointer]:
              - /url: /products/bachus-bachus-for-cats-dogs-hepatic-digest-60tables
          - paragraph [ref=e110]: BACHUS
          - generic [ref=e111]:
            - generic [ref=e112]: 26.00 EUR
            - link "Manjo Pet" [ref=e113] [cursor=pointer]:
              - /url: /shops/manjo-pet-087d8709
        - generic [ref=e116]:
          - paragraph [ref=e117]:
            - link "BACHUS للقطط والكلاب المناعة والمقاومة 60 حبة" [ref=e118] [cursor=pointer]:
              - /url: /products/bachus-bachus-for-cats-dogs-immunity-resistance-60tables
          - paragraph [ref=e119]: BACHUS
          - generic [ref=e120]:
            - generic [ref=e121]: 18.95 EUR
            - link "Manjo Pet" [ref=e122] [cursor=pointer]:
              - /url: /shops/manjo-pet-087d8709
        - generic [ref=e125]:
          - paragraph [ref=e126]:
            - link "باخوس للقطط والكلاب صغير وصحي 60 قرص" [ref=e127] [cursor=pointer]:
              - /url: /products/bachus-bachus-for-cats-dogs-small-healthy-60tables
          - paragraph [ref=e128]: BACHUS
          - generic [ref=e129]:
            - generic [ref=e130]: 25.00 EUR
            - link "Manjo Pet" [ref=e131] [cursor=pointer]:
              - /url: /shops/manjo-pet-087d8709
        - generic [ref=e134]:
          - paragraph [ref=e135]:
            - link "باخوس للقطط والكلاب الأسنان واللثة 60 قرص" [ref=e136] [cursor=pointer]:
              - /url: /products/bachus-bachus-for-cats-dogs-teeth-gums-60tables
          - paragraph [ref=e137]: BACHUS
          - generic [ref=e138]:
            - generic [ref=e139]: 25.00 EUR
            - link "Manjo Pet" [ref=e140] [cursor=pointer]:
              - /url: /shops/manjo-pet-087d8709
        - generic [ref=e143]:
          - paragraph [ref=e144]:
            - link "باخوس للقطط والكلاب المفاصل والمرونة 60 قرص" [ref=e145] [cursor=pointer]:
              - /url: /products/bachus-for-ctas-dogs-joints-flexi-60tables
          - generic [ref=e146]:
            - generic [ref=e147]: 28.00 EUR
            - link "Manjo Pet" [ref=e148] [cursor=pointer]:
              - /url: /shops/manjo-pet-087d8709
        - generic [ref=e151]:
          - paragraph [ref=e152]:
            - link "لحم البقر 100% مكافآت طبيعية للقطط والكلاب" [ref=e153] [cursor=pointer]:
              - /url: /products/beef-100-natural-rewords-for-cats-dogs
          - generic [ref=e154]:
            - generic [ref=e155]: 8.40 EUR
            - link "Manjo Pet" [ref=e156] [cursor=pointer]:
              - /url: /shops/manjo-pet-087d8709
        - generic [ref=e159]:
          - paragraph [ref=e160]:
            - link "BRIT فيليه في الصلصة للقطط البالغة أرنب صحي 85G" [ref=e161] [cursor=pointer]:
              - /url: /products/brit-brit-filletd-in-gravy-for-adult-cats-healthy-rabbit-85g
          - paragraph [ref=e162]: Brit
          - generic [ref=e163]:
            - generic [ref=e164]: 1.70 EUR
            - link "Manjo Pet" [ref=e165] [cursor=pointer]:
              - /url: /shops/manjo-pet-087d8709
        - generic [ref=e168]:
          - paragraph [ref=e169]:
            - link "BRIT فيليه في الصلصة للقطط البالغة اختيار دجاج 85G" [ref=e170] [cursor=pointer]:
              - /url: /products/brit-brit-fillets-in-gravy-for-adult-cats-choice-chicken-85g
          - paragraph [ref=e171]: Brit
          - generic [ref=e172]:
            - generic [ref=e173]: 1.70 EUR
            - link "Manjo Pet" [ref=e174] [cursor=pointer]:
              - /url: /shops/manjo-pet-087d8709
        - generic [ref=e177]:
          - paragraph [ref=e178]:
            - link "BRIT فيليه في الصلصة للقطط البالغة البط الصحي 85G" [ref=e179] [cursor=pointer]:
              - /url: /products/brit-brit-fillets-in-gravy-for-adult-cats-healthy-duck-85g
          - paragraph [ref=e180]: Brit
          - generic [ref=e181]:
            - generic [ref=e182]: 1.70 EUR
            - link "Manjo Pet" [ref=e183] [cursor=pointer]:
              - /url: /shops/manjo-pet-087d8709
        - generic [ref=e186]:
          - paragraph [ref=e187]:
            - link "بريت فيليه في الصلصة للقطط البالغة سلمون لذيذ 85G" [ref=e188] [cursor=pointer]:
              - /url: /products/brit-brit-fillets-in-gravy-for-adult-cats-savory-salmon-85g
          - paragraph [ref=e189]: Brit
          - generic [ref=e190]:
            - generic [ref=e191]: 1.70 EUR
            - link "Manjo Pet" [ref=e192] [cursor=pointer]:
              - /url: /shops/manjo-pet-087d8709
        - generic [ref=e195]:
          - paragraph [ref=e196]:
            - link "بريت فيليه في الصلصة للقطط البالغة ديك رومي طري وسلمون لذيذ 85G" [ref=e197] [cursor=pointer]:
              - /url: /products/brit-brit-fillets-in-gravy-for-adult-cats-tender-turkey-savory-salmon-85g
          - paragraph [ref=e198]: Brit
          - generic [ref=e199]:
            - generic [ref=e200]: 1.70 EUR
            - link "Manjo Pet" [ref=e201] [cursor=pointer]:
              - /url: /shops/manjo-pet-087d8709
        - generic [ref=e204]:
          - paragraph [ref=e205]:
            - link "بريت فيليه في الهلام للقطط البالغة دجاج متميز مع جبن 85G" [ref=e206] [cursor=pointer]:
              - /url: /products/brit-brit-fillets-in-jelly-for-adult-cats-choice-chicken-with-cheese-85g
          - paragraph [ref=e207]: Brit
          - generic [ref=e208]:
            - generic [ref=e209]: 1.70 EUR
            - link "Manjo Pet" [ref=e210] [cursor=pointer]:
              - /url: /shops/manjo-pet-087d8709
        - generic [ref=e213]:
          - paragraph [ref=e214]:
            - link "بريت فيليه في الهلام للقطط البالغة سمك السلمون الرقيق والمعطف 85G" [ref=e215] [cursor=pointer]:
              - /url: /products/brit-brit-fillets-in-jelly-for-adult-cats-fine-trout-coat-85g
          - paragraph [ref=e216]: Brit
          - generic [ref=e217]:
            - generic [ref=e218]: 1.70 EUR
            - link "Manjo Pet" [ref=e219] [cursor=pointer]:
              - /url: /shops/manjo-pet-087d8709
        - generic [ref=e222]:
          - paragraph [ref=e223]:
            - link "بريت فيليه في الهلام للقطط البالغة ديك رومي طري الروبيان 85G" [ref=e224] [cursor=pointer]:
              - /url: /products/brit-brit-fillets-in-jelly-for-adult-cats-tender-turkey-shrimps-85g
          - paragraph [ref=e225]: Brit
          - generic [ref=e226]:
            - generic [ref=e227]: 1.70 EUR
            - link "Manjo Pet" [ref=e228] [cursor=pointer]:
              - /url: /shops/manjo-pet-087d8709
        - generic [ref=e231]:
          - paragraph [ref=e232]:
            - link "BRIT SENSITIVE هضم صحي طعم لطيف ديك رومي طازج سلمون" [ref=e233] [cursor=pointer]:
              - /url: /products/brit-brit-sensitive-healthy-digestion-delicute-taste-fresh-turkey-salmon
          - paragraph [ref=e234]: Brit
          - generic [ref=e235]:
            - generic [ref=e236]: 6.00 EUR
            - link "Manjo Pet" [ref=e237] [cursor=pointer]:
              - /url: /shops/manjo-pet-087d8709
        - generic [ref=e240]:
          - paragraph [ref=e241]:
            - link "CAMON فأر / طائر فالب مع CATNIP والجرس 10 CM" [ref=e242] [cursor=pointer]:
              - /url: /products/camon-camon-plush-mouse-bird-with-catnip-and-bell-10-cm
          - paragraph [ref=e243]: CAMON
          - generic [ref=e244]:
            - generic [ref=e245]: 4.50 EUR
            - link "Manjo Pet" [ref=e246] [cursor=pointer]:
              - /url: /shops/manjo-pet-087d8709
        - generic [ref=e249]:
          - paragraph [ref=e250]:
            - link "CAMON PRO 2 حقنة الطعام للكلاب والقطط" [ref=e251] [cursor=pointer]:
              - /url: /products/camon-camon-pro-2-food-syringe-for-dogs-and-cats
          - paragraph [ref=e252]: CAMON
          - generic [ref=e253]:
            - generic [ref=e254]: 8.00 EUR
            - link "Manjo Pet" [ref=e255] [cursor=pointer]:
              - /url: /shops/manjo-pet-087d8709
        - generic [ref=e258]:
          - paragraph [ref=e259]:
            - link "CARUSO طوق القط" [ref=e260] [cursor=pointer]:
              - /url: /products/m-pets-caruso-cat-collar
          - paragraph [ref=e261]: M-Pets
          - generic [ref=e262]:
            - generic [ref=e263]: 4.00 EUR
            - link "Manjo Pet" [ref=e264] [cursor=pointer]:
              - /url: /shops/manjo-pet-087d8709
        - generic [ref=e267]:
          - paragraph [ref=e268]:
            - link "طوق قط جرس مع ربطة عنق بورجوندي 10 MM" [ref=e269] [cursor=pointer]:
              - /url: /products/cat-collar-bell-with-bow-tie-burgundy-10-mm
          - generic [ref=e270]:
            - generic [ref=e271]: 5.50 EUR
            - link "Manjo Pet" [ref=e272] [cursor=pointer]:
              - /url: /shops/manjo-pet-087d8709
        - generic [ref=e275]:
          - paragraph [ref=e276]:
            - link "طوق قط جرس مع ربطة عنق ليلكي 10 MM 20/30" [ref=e277] [cursor=pointer]:
              - /url: /products/cat-collar-bell-with-bow-tie-lilac-10-mm-20-30
          - generic [ref=e278]:
            - generic [ref=e279]: 5.50 EUR
            - link "Manjo Pet" [ref=e280] [cursor=pointer]:
              - /url: /shops/manjo-pet-087d8709
        - generic [ref=e283]:
          - paragraph [ref=e284]:
            - link "طوق قط مع ربطة عنق وردي 10 MM X 20/30" [ref=e285] [cursor=pointer]:
              - /url: /products/cat-collar-with-bow-tie-pink-10-mm-x-20-30
          - generic [ref=e286]:
            - generic [ref=e287]: 5.50 EUR
            - link "Manjo Pet" [ref=e288] [cursor=pointer]:
              - /url: /shops/manjo-pet-087d8709
        - generic [ref=e291]:
          - paragraph [ref=e292]:
            - link "أثاث القط أسود" [ref=e293] [cursor=pointer]:
              - /url: /products/cat-furniture-black
          - generic [ref=e294]:
            - generic [ref=e295]: 88.00 EUR
            - link "Manjo Pet" [ref=e296] [cursor=pointer]:
              - /url: /shops/manjo-pet-087d8709
        - generic [ref=e299]:
          - paragraph [ref=e300]:
            - link "CAT GLOBAL رمل القط بودرة الأطفال 10 L" [ref=e301] [cursor=pointer]:
              - /url: /products/cat-global-cat-global-cat-litter-baby-powder-10-l
          - paragraph [ref=e302]: CAT GLOBAL
          - generic [ref=e303]:
            - generic [ref=e304]: 13.00 EUR
            - link "Manjo Pet" [ref=e305] [cursor=pointer]:
              - /url: /shops/manjo-pet-087d8709
        - generic [ref=e308]:
          - paragraph [ref=e309]:
            - link "CAT GLOBAL – رمل القطط – اللافندر – 20KG" [ref=e310] [cursor=pointer]:
              - /url: /products/cat-global-cat-global-cat-litter-levander-20kg
          - paragraph [ref=e311]: CAT GLOBAL
          - generic [ref=e312]:
            - generic [ref=e313]: 28.00 EUR
            - link "Manjo Pet" [ref=e314] [cursor=pointer]:
              - /url: /shops/manjo-pet-087d8709
        - generic [ref=e317]:
          - paragraph [ref=e318]:
            - link "CAT GLOBAL رمل الخزامى 10 L" [ref=e319] [cursor=pointer]:
              - /url: /products/cat-global-cat-global-litter-levander-10-l
          - paragraph [ref=e320]: CAT GLOBAL
          - generic [ref=e321]:
            - generic [ref=e322]: 13.00 EUR
            - link "Manjo Pet" [ref=e323] [cursor=pointer]:
              - /url: /shops/manjo-pet-087d8709
        - generic [ref=e326]:
          - paragraph [ref=e327]:
            - link "CAT GLOBAL (N.B) بودرة الأطفال 20 KG" [ref=e328] [cursor=pointer]:
              - /url: /products/cat-global-cat-global-n-b-baby-powder-20-kg
          - paragraph [ref=e329]: CAT GLOBAL
          - generic [ref=e330]:
            - generic [ref=e331]: 28.00 EUR
            - link "Manjo Pet" [ref=e332] [cursor=pointer]:
              - /url: /shops/manjo-pet-087d8709
        - generic [ref=e335]:
          - paragraph [ref=e336]:
            - link "حصيرة رمل القطط 60X55 CM" [ref=e337] [cursor=pointer]:
              - /url: /products/cat-litter-mat-60x55-cm
          - generic [ref=e338]:
            - generic [ref=e339]: 20.00 EUR
            - link "Manjo Pet" [ref=e340] [cursor=pointer]:
              - /url: /shops/manjo-pet-087d8709
        - generic [ref=e343]:
          - paragraph [ref=e344]:
            - link "صينية رمل القطط IRIZ42″ أنثراسايت 42X30,5X10CM" [ref=e345] [cursor=pointer]:
              - /url: /products/cat-litter-tray-iriz42-anthracite-42x305x10cm
          - generic [ref=e346]:
            - generic [ref=e347]: 7.00 EUR
            - link "Manjo Pet" [ref=e348] [cursor=pointer]:
              - /url: /shops/manjo-pet-087d8709
        - generic [ref=e351]:
          - paragraph [ref=e352]:
            - link "صندوق فضلات القط IRIZ42″ حجر أزرق 42X30,5X10CM" [ref=e353] [cursor=pointer]:
              - /url: /products/cat-litter-tray-iriz42-bluestone-42x305x10cm
          - generic [ref=e354]:
            - generic [ref=e355]: 5.00 EUR
            - link "Manjo Pet" [ref=e356] [cursor=pointer]:
              - /url: /shops/manjo-pet-087d8709
        - generic [ref=e359]:
          - paragraph [ref=e360]:
            - link "صندوق فضلات القط TAT PITOU MATTI رمادي 30*40 CM" [ref=e361] [cursor=pointer]:
              - /url: /products/cat-litter-tray-tat-pitou-matti-grey-30-40-cm
          - generic [ref=e362]:
            - generic [ref=e363]: 6.70 EUR
            - link "Manjo Pet" [ref=e364] [cursor=pointer]:
              - /url: /shops/manjo-pet-087d8709
        - generic [ref=e367]:
          - paragraph [ref=e368]:
            - link "صندوق فضلات القط&RIM IRIZ42″ أنثراسايت 42X31X12,5CM" [ref=e369] [cursor=pointer]:
              - /url: /products/cat-litter-tray-rim-iriz42-anthracite-42x31x125cm
          - generic [ref=e370]:
            - generic [ref=e371]: 7.40 EUR
            - link "Manjo Pet" [ref=e372] [cursor=pointer]:
              - /url: /shops/manjo-pet-087d8709
        - generic [ref=e375]:
          - paragraph [ref=e376]:
            - link "صينية رمل القطط+RIM IRIZ50\" حجر أزرق 50X37X14CM" [ref=e377] [cursor=pointer]:
              - /url: /products/cat-litter-tray-rim-iriz50-bluestone-50x37x14cm
          - generic [ref=e378]:
            - generic [ref=e379]: 10.50 EUR
            - link "Manjo Pet" [ref=e380] [cursor=pointer]:
              - /url: /shops/manjo-pet-087d8709
        - generic [ref=e383]:
          - paragraph [ref=e384]:
            - link "CAT LUVS الفأر" [ref=e385] [cursor=pointer]:
              - /url: /products/cat-luvs-mouse
          - generic [ref=e386]:
            - generic [ref=e387]: 9.00 EUR
            - link "Manjo Pet" [ref=e388] [cursor=pointer]:
              - /url: /shops/manjo-pet-087d8709
        - generic [ref=e391]:
          - paragraph [ref=e392]:
            - link "فن أظافر القطط | GLEE CACTUS DOUBLE" [ref=e393] [cursor=pointer]:
              - /url: /products/cat-nail-art-glee-cactus-double
          - generic [ref=e394]:
            - generic [ref=e395]: 65.75 EUR
            - link "Manjo Pet" [ref=e396] [cursor=pointer]:
              - /url: /shops/manjo-pet-087d8709
        - generic [ref=e399]:
          - paragraph [ref=e400]:
            - link "فن أظافر القطط | GLEE CACTUS" [ref=e401] [cursor=pointer]:
              - /url: /products/cat-nail-art-glee-cactus
          - generic [ref=e402]:
            - generic [ref=e403]: 34.99 EUR
            - link "Manjo Pet" [ref=e404] [cursor=pointer]:
              - /url: /shops/manjo-pet-087d8709
        - generic [ref=e407]:
          - paragraph [ref=e408]:
            - link "خدش القطط كرة القدم الريش" [ref=e409] [cursor=pointer]:
              - /url: /products/cat-scratchfootball-feather
          - generic [ref=e410]:
            - generic [ref=e411]: 29.00 EUR
            - link "Manjo Pet" [ref=e412] [cursor=pointer]:
              - /url: /shops/manjo-pet-087d8709
        - generic [ref=e415]:
          - paragraph [ref=e416]:
            - link "خط شجرة خدش القطط" [ref=e417] [cursor=pointer]:
              - /url: /products/cat-scratch-tree-line
          - generic [ref=e418]:
            - generic [ref=e419]: 33.00 EUR
            - link "Manjo Pet" [ref=e420] [cursor=pointer]:
              - /url: /shops/manjo-pet-087d8709
        - generic [ref=e423]:
          - paragraph [ref=e424]:
            - link "خادش القطط ALVIN 34X35X40 CM" [ref=e425] [cursor=pointer]:
              - /url: /products/cat-scratcher-alvin-34x35x40-cm
          - generic [ref=e426]:
            - generic [ref=e427]: 48.00 EUR
            - link "Manjo Pet" [ref=e428] [cursor=pointer]:
              - /url: /shops/manjo-pet-087d8709
        - generic [ref=e431]:
          - paragraph [ref=e432]:
            - link "خادش القطط BAFFO 30X30X40 CM" [ref=e433] [cursor=pointer]:
              - /url: /products/cat-scratcher-baffo-30x30x40-cm
          - generic [ref=e434]:
            - generic [ref=e435]: 12.90 EUR
            - link "Manjo Pet" [ref=e436] [cursor=pointer]:
              - /url: /shops/manjo-pet-087d8709
        - generic [ref=e439]:
          - paragraph [ref=e440]:
            - link "خادش القطط BAFFO" [ref=e441] [cursor=pointer]:
              - /url: /products/cat-scratcher-baffo
          - generic [ref=e442]:
            - generic [ref=e443]: 12.90 EUR
            - link "Manjo Pet" [ref=e444] [cursor=pointer]:
              - /url: /shops/manjo-pet-087d8709
        - generic [ref=e447]:
          - paragraph [ref=e448]:
            - link "مخدش القطط صبار 34*34*65 CM" [ref=e449] [cursor=pointer]:
              - /url: /products/cat-scratcher-cactus-34-34-65-cm
          - generic [ref=e450]:
            - generic [ref=e451]: 31.00 EUR
            - link "Manjo Pet" [ref=e452] [cursor=pointer]:
              - /url: /shops/manjo-pet-087d8709
        - generic [ref=e455]:
          - paragraph [ref=e456]:
            - link "مخدش القطط باكو 35X35X97.5 CM" [ref=e457] [cursor=pointer]:
              - /url: /products/cat-scratcher-paco-35x35x97-5-cm
          - generic [ref=e458]:
            - generic [ref=e459]: 68.00 EUR
            - link "Manjo Pet" [ref=e460] [cursor=pointer]:
              - /url: /shops/manjo-pet-087d8709
        - generic [ref=e463]:
          - paragraph [ref=e464]:
            - link "عمود خدش القطط مع الكرة 15 CM, 40 X 20 X H 17 CM" [ref=e465] [cursor=pointer]:
              - /url: /products/cat-scratching-post-with-ball-15-cm-40-x-20-x-h-17-cm
          - generic [ref=e466]:
            - generic [ref=e467]: 25.00 EUR
            - link "Manjo Pet" [ref=e468] [cursor=pointer]:
              - /url: /shops/manjo-pet-087d8709
        - generic [ref=e471]:
          - paragraph [ref=e472]:
            - link "لعبة القط مؤشر الليزر على شكل فأر 6.5 سم أحمر" [ref=e473] [cursor=pointer]:
              - /url: /products/camon-cat-toy-laser-pointer-in-the-shape-of-a-mouse-6-5-cm-red
          - paragraph [ref=e474]: CAMON
          - generic [ref=e475]:
            - generic [ref=e476]: 10.00 EUR
            - link "Manjo Pet" [ref=e477] [cursor=pointer]:
              - /url: /shops/manjo-pet-087d8709
        - generic [ref=e480]:
          - paragraph [ref=e481]:
            - link "لعبة القط كرة ماتاتابي" [ref=e482] [cursor=pointer]:
              - /url: /products/camon-cat-toy-matatabi-sphere
          - paragraph [ref=e483]: CAMON
          - generic [ref=e484]:
            - generic [ref=e485]: 4.50 EUR
            - link "Manjo Pet" [ref=e486] [cursor=pointer]:
              - /url: /shops/manjo-pet-087d8709
        - generic [ref=e489]:
          - paragraph [ref=e490]:
            - link "شجرة القط VICTORIA 125 – رمادي – 12 سم عمود – الوسادة مشمولة" [ref=e491] [cursor=pointer]:
              - /url: /products/cat-tree-victoria-125-grey-12cm-post-cushion-incl
          - generic [ref=e492]:
            - generic [ref=e493]: 300.00 EUR
            - link "Manjo Pet" [ref=e494] [cursor=pointer]:
              - /url: /shops/manjo-pet-087d8709
        - generic [ref=e497]:
          - paragraph [ref=e498]:
            - link "CATIT موزع مياه القط خرطوشة استبدال – V" [ref=e499] [cursor=pointer]:
              - /url: /products/catit-cat-waterer-replacemet-catridg-v
          - generic [ref=e500]:
            - generic [ref=e501]: 9.00 EUR
            - link "Manjo Pet" [ref=e502] [cursor=pointer]:
              - /url: /shops/manjo-pet-087d8709
        - generic [ref=e505]:
          - paragraph [ref=e506]:
            - link "HYGGE شرائح الدجاج غذاء كامل للقطط البالغة 70 G" [ref=e507] [cursor=pointer]:
              - /url: /products/hygge-hygge-chicken-fillets-complete-food-for-adult-cats-70-g
          - paragraph [ref=e508]: HYGGE
          - generic [ref=e509]:
            - generic [ref=e510]: 1.50 EUR
            - link "Manjo Pet" [ref=e511] [cursor=pointer]:
              - /url: /shops/manjo-pet-087d8709
        - generic [ref=e514]:
          - paragraph [ref=e515]:
            - link "CROCI تنظيف سهل رمل قطط بلوري 15 لتر" [ref=e516] [cursor=pointer]:
              - /url: /products/croci-croci-easy-clean-crystal-cat-litter-15lt
          - paragraph [ref=e517]: CROCI
          - generic [ref=e518]:
            - generic [ref=e519]: 32.00 EUR
            - link "Manjo Pet" [ref=e520] [cursor=pointer]:
              - /url: /shops/manjo-pet-087d8709
        - generic [ref=e523]:
          - paragraph [ref=e524]:
            - link "CROCI تنظيف سهل رمل قطط بلوري 7.5 لتر" [ref=e525] [cursor=pointer]:
              - /url: /products/croci-croci-easy-clean-crystal-cat-litter-7-5lt
          - paragraph [ref=e526]: CROCI
          - generic [ref=e527]:
            - generic [ref=e528]: 18.00 EUR
            - link "Manjo Pet" [ref=e529] [cursor=pointer]:
              - /url: /shops/manjo-pet-087d8709
        - generic [ref=e532]:
          - paragraph [ref=e533]:
            - link "CROCI EASY CLEAN SILICA رمل القطط 7.5L تفاح" [ref=e534] [cursor=pointer]:
              - /url: /products/croci-croci-easy-clean-silica-cat-litter-7-5l-apple
          - paragraph [ref=e535]: CROCI
          - generic [ref=e536]:
            - generic [ref=e537]: 18.00 EUR
            - link "Manjo Pet" [ref=e538] [cursor=pointer]:
              - /url: /shops/manjo-pet-087d8709
      - generic [ref=e541]:
        - button "Marker" [ref=e542] [cursor=pointer]
        - generic:
          - generic [ref=e543]:
            - button "Zoom in" [ref=e544] [cursor=pointer]: +
            - button "Zoom out" [ref=e545] [cursor=pointer]: −
          - generic [ref=e546]:
            - link "Leaflet" [ref=e547] [cursor=pointer]:
              - /url: https://leafletjs.com
              - img [ref=e548]
              - text: Leaflet
            - text: "| ©"
            - link "OpenStreetMap" [ref=e552] [cursor=pointer]:
              - /url: https://www.openstreetmap.org/copyright
            - text: ©
            - link "CARTO" [ref=e553] [cursor=pointer]:
              - /url: https://carto.com/
  - contentinfo [ref=e554]:
    - generic [ref=e555]:
      - navigation "legal" [ref=e556]:
        - link "من نحن" [ref=e557] [cursor=pointer]:
          - /url: /about
        - link "اتصل بنا" [ref=e558] [cursor=pointer]:
          - /url: /contact
        - link "بيانات الشركة" [ref=e559] [cursor=pointer]:
          - /url: /legal/imprint
        - link "سياسة الخصوصية" [ref=e560] [cursor=pointer]:
          - /url: /legal/privacy
        - link "شروط الاستخدام" [ref=e561] [cursor=pointer]:
          - /url: /legal/terms
      - paragraph [ref=e562]: © 2026 pundo
  - generic [ref=e567] [cursor=pointer]:
    - button "Open Next.js Dev Tools" [ref=e568]:
      - img [ref=e569]
    - generic [ref=e572]:
      - button "Open issues overlay" [ref=e573]:
        - generic [ref=e574]:
          - generic [ref=e575]: "0"
          - generic [ref=e576]: "1"
        - generic [ref=e577]: Issue
      - button "Collapse issues badge" [ref=e578]:
        - img [ref=e579]
  - alert [ref=e581]
```

# Test source

```ts
  327 |     expect(errors).toHaveLength(0)
  328 |   })
  329 | 
  330 |   test('no JS errors on signup page', async ({ page }) => {
  331 |     const errors: string[] = []
  332 |     page.on('pageerror', (err) => {
  333 |       if (!err.message.includes('Hydration failed')) errors.push(err.message)
  334 |     })
  335 |     await page.goto('/auth/signup')
  336 |     await page.waitForLoadState('networkidle')
  337 |     expect(errors).toHaveLength(0)
  338 |   })
  339 | })
  340 | 
  341 | // ─── E2E-10: Review Section on Product/Shop Pages ────────────────────────────
  342 | 
  343 | test.describe('E2E-10: Review Section', () => {
  344 |   const TEST_PRODUCT_SLUG = 'acana-acana-wild-prairie-cat-18kg'
  345 | 
  346 |   test('product page renders without crash', async ({ page }) => {
  347 |     const errors: string[] = []
  348 |     page.on('pageerror', (err) => {
  349 |       if (!err.message.includes('Hydration failed')) errors.push(err.message)
  350 |     })
  351 |     await page.goto(`/products/${TEST_PRODUCT_SLUG}`)
  352 |     await page.waitForLoadState('networkidle')
  353 |     expect(errors).toHaveLength(0)
  354 |   })
  355 | 
  356 |   test('product page shows review section or login prompt', async ({ page }) => {
  357 |     await page.goto(`/products/${TEST_PRODUCT_SLUG}`)
  358 |     await page.waitForLoadState('networkidle')
  359 |     // ReviewForm should be present (either login prompt or star input)
  360 |     // The section container always renders even for unauthenticated users
  361 |     const body = await page.content()
  362 |     // Either star buttons or a login link/button must exist
  363 |     const hasStars = await page.locator('[aria-label$="stars"]').count()
  364 |     const hasLoginHint = body.includes('login') || body.includes('Login') || body.includes('anmelden') || body.includes('Anmelden')
  365 |     expect(hasStars > 0 || hasLoginHint).toBe(true)
  366 |   })
  367 | 
  368 |   test('RTL: product page with Arabic sets dir=rtl', async ({ page }) => {
  369 |     await page.context().addCookies([{
  370 |       name: 'pundo_lang', value: 'ar', domain: 'localhost', path: '/',
  371 |     }])
  372 |     const errors: string[] = []
  373 |     page.on('pageerror', (err) => {
  374 |       if (!err.message.includes('Hydration failed')) errors.push(err.message)
  375 |     })
  376 |     await page.goto(`/products/${TEST_PRODUCT_SLUG}`)
  377 |     await page.waitForLoadState('networkidle')
  378 |     const dir = await page.locator('html').getAttribute('dir')
  379 |     expect(dir).toBe('rtl')
  380 |     expect(errors).toHaveLength(0)
  381 |   })
  382 | })
  383 | 
  384 | test.describe('E2E-08: Karten-Routing-Links', () => {
  385 |   test('map popup shows 3 routing links with correct URLs after clicking a pin', async ({ page }) => {
  386 |     await page.goto('/search?q=cat')
  387 |     // Switch to map view
  388 |     await page.getByRole('button', { name: /map|karte/i }).click()
  389 |     // Wait for Leaflet to load
  390 |     await page.waitForSelector('.leaflet-marker-icon', { timeout: 10000 })
  391 |     // Click first marker
  392 |     await page.locator('.leaflet-marker-icon').first().click()
  393 |     // Wait for popup
  394 |     await page.waitForSelector('.leaflet-popup-content', { timeout: 5000 })
  395 | 
  396 |     const links = page.locator('.leaflet-popup-content a')
  397 |     await expect(links).toHaveCount(3)
  398 | 
  399 |     const hrefs = await links.evaluateAll((els: HTMLAnchorElement[]) => els.map(e => e.href))
  400 |     expect(hrefs[0]).toContain('google.com/maps/dir/')
  401 |     expect(hrefs[0]).toContain('destination=')
  402 |     expect(hrefs[1]).toContain('maps.apple.com')
  403 |     expect(hrefs[1]).toContain('daddr=')
  404 |     expect(hrefs[2]).toContain('waze.com/ul')
  405 |     expect(hrefs[2]).toContain('navigate=yes')
  406 |   })
  407 | 
  408 |   test('routing links open in new tab (target=_blank)', async ({ page }) => {
  409 |     await page.goto('/search?q=cat')
  410 |     await page.getByRole('button', { name: /map|karte/i }).click()
  411 |     await page.waitForSelector('.leaflet-marker-icon', { timeout: 10000 })
  412 |     await page.locator('.leaflet-marker-icon').first().click()
  413 |     await page.waitForSelector('.leaflet-popup-content', { timeout: 5000 })
  414 | 
  415 |     const targets = await page.locator('.leaflet-popup-content a').evaluateAll(
  416 |       (els: HTMLAnchorElement[]) => els.map(e => e.target)
  417 |     )
  418 |     expect(targets.every(t => t === '_blank')).toBe(true)
  419 |   })
  420 | 
  421 |   test('popup dir=rtl for Arabic lang', async ({ page }) => {
  422 |     await page.goto('/search?q=cat')
  423 |     await page.evaluate(() => {
  424 |       document.cookie = 'pundo_lang=ar; path=/'
  425 |     })
  426 |     await page.reload()
> 427 |     await page.getByRole('button', { name: /خريطة|map/i }).click()
      |                                                            ^ Error: locator.click: Test timeout of 30000ms exceeded.
  428 |     await page.waitForSelector('.leaflet-marker-icon', { timeout: 10000 })
  429 |     await page.locator('.leaflet-marker-icon').first().click()
  430 |     await page.waitForSelector('.leaflet-popup-content', { timeout: 5000 })
  431 | 
  432 |     const dir = await page.locator('.leaflet-popup-content div').first().getAttribute('dir')
  433 |     expect(dir).toBe('rtl')
  434 |   })
  435 | })
  436 | 
```