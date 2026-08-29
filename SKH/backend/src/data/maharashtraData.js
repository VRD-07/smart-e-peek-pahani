/**
 * Authentic Maharashtra Revenue Administrative Hierarchy
 * Covers all 6 Administrative Divisions:
 * 1. Nashik Division (नाशिक महसूल विभाग - उत्तर महाराष्ट्र)
 * 2. Pune Division (पुणे महसूल विभाग - पश्चिम महाराष्ट्र)
 * 3. Chhatrapati Sambhajinagar Division (छत्रपती संभाजीनगर महसूल विभाग - मराठवाडा)
 * 4. Amravati Division (अमरावती महसूल विभाग - पश्चिम विदर्भ)
 * 5. Nagpur Division (नागपूर महसूल विभाग - पूर्व विदर्भ)
 * 6. Konkan Division (कोकण महसूल विभाग)
 */

const MAHARASHTRA_DIVISIONS = [
  {
    id: "NASHIK",
    name: "Nashik Division",
    nameMr: "नाशिक महसूल विभाग (उत्तर महाराष्ट्र)",
    districts: [
      {
        id: "NASHIK_DIST",
        name: "Nashik",
        nameMr: "नाशिक",
        talukas: [
          {
            id: "NIPHAD",
            name: "Niphad",
            nameMr: "निफाड",
            villages: [
              { name: "Murshatpur", nameMr: "मुर्शदपूर", defaultGats: ["101", "102", "103", "104", "105", "106"] },
              { name: "Pimpalgaon Baswant", nameMr: "पिंपळगाव बसवंत", defaultGats: ["101", "102", "105", "142", "150"] },
              { name: "Ozar", nameMr: "ओझर", defaultGats: ["201", "202", "208", "215", "230"] },
              { name: "Saykheda", nameMr: "सायखेडा", defaultGats: ["301", "305", "312", "325"] },
              { name: "Lasalgaon", nameMr: "लासलगाव", defaultGats: ["401", "402", "410", "415", "420"] },
              { name: "Chandori", nameMr: "चांदोरी", defaultGats: ["111", "112", "115", "120"] },
              { name: "Ugav", nameMr: "उगाव", defaultGats: ["221", "222", "225", "230"] },
              { name: "Ranwad", nameMr: "रानवड", defaultGats: ["331", "332", "335"] },
              { name: "Vinchur", nameMr: "विंचूर", defaultGats: ["441", "442", "450"] },
              { name: "Deogaon", nameMr: "देवगाव", defaultGats: ["501", "502", "505"] },
              { name: "Khedle Jhunge", nameMr: "खेडलेझुंगे", defaultGats: ["601", "602", "608"] },
              { name: "Karanjgaon", nameMr: "करंजगाव", defaultGats: ["701", "702", "705"] },
              { name: "Shirasgaon", nameMr: "शिरसगाव", defaultGats: ["801", "802", "805"] },
              { name: "Kotamgaon", nameMr: "कोतमगाव", defaultGats: ["901", "902", "905"] }
            ]
          },
          {
            id: "SINNAR",
            name: "Sinnar",
            nameMr: "सिन्नर",
            villages: [
              { name: "Wavi", nameMr: "वावी", defaultGats: ["111", "112", "115", "120"] },
              { name: "Musalgaon", nameMr: "मुसळगाव", defaultGats: ["211", "212", "215"] },
              { name: "Pangri", nameMr: "पांगरी", defaultGats: ["311", "315", "320"] },
              { name: "Dodi Budruk", nameMr: "दोडी बुद्रुक", defaultGats: ["411", "412", "415"] },
              { name: "Baragaon Pimpri", nameMr: "बारागाव पिंप्री", defaultGats: ["511", "512", "515"] },
              { name: "Dubere", nameMr: "डुबेरे", defaultGats: ["611", "612", "615"] },
              { name: "Shah", nameMr: "शहा", defaultGats: ["711", "712"] },
              { name: "Nandur Shingote", nameMr: "नांदूर शिंगोटे", defaultGats: ["811", "812", "815"] },
              { name: "Pandhurli", nameMr: "पांढुर्ली", defaultGats: ["911", "912"] },
              { name: "Vadangali", nameMr: "वडांगळी", defaultGats: ["1011", "1012"] }
            ]
          },
          {
            id: "DINDORI",
            name: "Dindori",
            nameMr: "दिंडोरी",
            villages: [
              { name: "Vani", nameMr: "वणी", defaultGats: ["121", "122", "125", "130"] },
              { name: "Janori", nameMr: "जानोरी", defaultGats: ["221", "222", "225"] },
              { name: "Mohadi", nameMr: "मोहाडी", defaultGats: ["321", "322", "325"] },
              { name: "Khedgaon", nameMr: "खेडगाव", defaultGats: ["421", "422"] },
              { name: "Nanashi", nameMr: "ननाशी", defaultGats: ["521", "522"] },
              { name: "Umrale", nameMr: "उमराळे", defaultGats: ["621", "622"] },
              { name: "Varwandi", nameMr: "वरवंडी", defaultGats: ["721", "722"] }
            ]
          },
          {
            id: "YEOLA",
            name: "Yeola",
            nameMr: "येवला",
            villages: [
              { name: "Andarsul", nameMr: "अंदरसूल", defaultGats: ["131", "132", "135"] },
              { name: "Nagarsul", nameMr: "नगरसूल", defaultGats: ["231", "232", "235"] },
              { name: "Savargaon", nameMr: "सावरगाव", defaultGats: ["331", "332"] },
              { name: "Patoda", nameMr: "पाटोदा", defaultGats: ["431", "432"] },
              { name: "Mukhed", nameMr: "मुखेड", defaultGats: ["531", "532"] },
              { name: "Babhulgaon", nameMr: "बाभळगाव", defaultGats: ["631", "632"] }
            ]
          },
          {
            id: "MALEGAON",
            name: "Malegaon",
            nameMr: "मालेगाव",
            villages: [
              { name: "Dabhadi", nameMr: "दाभाडी", defaultGats: ["141", "142", "145"] },
              { name: "Vadner", nameMr: "वडनेर", defaultGats: ["241", "242"] },
              { name: "Zodge", nameMr: "झोडगे", defaultGats: ["341", "342"] },
              { name: "Ravalgaon", nameMr: "रावळगाव", defaultGats: ["441", "442"] },
              { name: "Saundane", nameMr: "सौंदाणे", defaultGats: ["541", "542"] },
              { name: "Nimgaon", nameMr: "निमगाव", defaultGats: ["641", "642"] }
            ]
          },
          {
            id: "CHANDWAD",
            name: "Chandwad",
            nameMr: "चांदवड",
            villages: [
              { name: "Vadbare", nameMr: "वडबारे", defaultGats: ["151", "152"] },
              { name: "Rahud", nameMr: "राहुड", defaultGats: ["251", "252"] },
              { name: "Dahiwad", nameMr: "दहीवाड", defaultGats: ["351", "352"] },
              { name: "Mangrul", nameMr: "मंगरूळ", defaultGats: ["451", "452"] }
            ]
          },
          {
            id: "BAGLAN_SATANA",
            name: "Baglan (Satana)",
            nameMr: "बागलाण (सटाणा)",
            villages: [
              { name: "Taharabad", nameMr: "ताहराबाद", defaultGats: ["161", "162"] },
              { name: "Nampur", nameMr: "नामुपूर", defaultGats: ["261", "262"] },
              { name: "Brahmangaon", nameMr: "ब्राह्मणगाव", defaultGats: ["361", "362"] },
              { name: "Jaykheda", nameMr: "जायखेडा", defaultGats: ["461", "462"] }
            ]
          },
          {
            id: "IGATPURI",
            name: "Igatpuri",
            nameMr: "इगतपुरी",
            villages: [
              { name: "Ghoti Budruk", nameMr: "घोटी बुद्रुक", defaultGats: ["171", "172"] },
              { name: "Taked", nameMr: "टाकेद", defaultGats: ["271", "272"] },
              { name: "Bhavali", nameMr: "भावली", defaultGats: ["371", "372"] }
            ]
          }
        ]
      },
      {
        id: "AHILYANAGAR_DIST",
        name: "Ahilyanagar",
        nameMr: "अहिल्यानगर (अहमदनगर)",
        talukas: [
          {
            id: "KOPARGAON",
            name: "Kopargaon",
            nameMr: "कोपरगाव",
            villages: [
              { name: "Murshatpur", nameMr: "मुर्शदपूर", defaultGats: ["101", "102", "103", "104", "105", "106"] },
              { name: "Pohegaon", nameMr: "पोहेगाव", defaultGats: ["151", "152", "155"] },
              { name: "Kolpewadi", nameMr: "कोळपेवाडी", defaultGats: ["251", "252", "255"] },
              { name: "Savalvihir", nameMr: "सावळविहीर", defaultGats: ["351", "352"] },
              { name: "Suregaon", nameMr: "सुरेगाव", defaultGats: ["451", "452"] },
              { name: "Dhamori", nameMr: "धामोरी", defaultGats: ["551", "552"] },
              { name: "Takli", nameMr: "टाकळी", defaultGats: ["651", "652"] },
              { name: "Kakadi", nameMr: "काकडी", defaultGats: ["751", "752"] },
              { name: "Singnapur", nameMr: "शिंगणापूर", defaultGats: ["851", "852"] }
            ]
          },
          {
            id: "RAHATA",
            name: "Rahata",
            nameMr: "राहाता",
            villages: [
              { name: "Shirdi", nameMr: "शिर्डी", defaultGats: ["161", "162", "165"] },
              { name: "Sakuri", nameMr: "साकुरी", defaultGats: ["261", "262"] },
              { name: "Loni", nameMr: "लोणी", defaultGats: ["361", "362", "365"] },
              { name: "Babhaleshwar", nameMr: "बाभळेश्वर", defaultGats: ["461", "462"] },
              { name: "Kolhar", nameMr: "कोल्हार", defaultGats: ["561", "562"] },
              { name: "Puntamba", nameMr: "पुणतांबा", defaultGats: ["661", "662", "665"] },
              { name: "Adgaon", nameMr: "आडगाव", defaultGats: ["761", "762"] }
            ]
          },
          {
            id: "SANGAMNER",
            name: "Sangamner",
            nameMr: "संगमनेर",
            villages: [
              { name: "Gunjalwadi", nameMr: "गुंजाळवाडी", defaultGats: ["171", "172"] },
              { name: "Talegaon", nameMr: "तळेगाव", defaultGats: ["271", "272"] },
              { name: "Ashwi", nameMr: "आश्वी", defaultGats: ["371", "372"] },
              { name: "Dhandarphal", nameMr: "धांदरफळ", defaultGats: ["471", "472"] },
              { name: "Ghulewadi", nameMr: "घुलेवाडी", defaultGats: ["571", "572"] },
              { name: "Samnapur", nameMr: "समनापूर", defaultGats: ["671", "672"] },
              { name: "Sakur", nameMr: "साकूर", defaultGats: ["771", "772"] }
            ]
          },
          {
            id: "SHRIRAMPUR",
            name: "Shrirampur",
            nameMr: "श्रीरामपूर",
            villages: [
              { name: "Belapur", nameMr: "बेलापूर", defaultGats: ["181", "182", "185"] },
              { name: "Taklibhan", nameMr: "टाकळीभान", defaultGats: ["281", "282"] },
              { name: "Undirgaon", nameMr: "उंदीरगाव", defaultGats: ["381", "382"] },
              { name: "Khandala", nameMr: "खंडाळा", defaultGats: ["481", "482"] },
              { name: "Padhegaon", nameMr: "पढेगाव", defaultGats: ["581", "582"] }
            ]
          },
          {
            id: "NEWASA",
            name: "Newasa",
            nameMr: "नेवासा",
            villages: [
              { name: "Newasa Phata", nameMr: "नेवासा फाटा", defaultGats: ["191", "192"] },
              { name: "Sonai", nameMr: "सोनई", defaultGats: ["291", "292", "295"] },
              { name: "Kukana", nameMr: "कुकाणा", defaultGats: ["391", "392"] },
              { name: "Bhende", nameMr: "भेंडे बुद्रुक", defaultGats: ["491", "492"] },
              { name: "Chanda", nameMr: "चांदा", defaultGats: ["591", "592"] }
            ]
          },
          {
            id: "RAHURI",
            name: "Rahuri",
            nameMr: "राहुरी",
            villages: [
              { name: "Vambori", nameMr: "वांबोरी", defaultGats: ["101", "102", "105"] },
              { name: "Digras", nameMr: "दिग्रस", defaultGats: ["201", "202"] },
              { name: "Songaon", nameMr: "सोनगाव", defaultGats: ["301", "302"] },
              { name: "Takli", nameMr: "टाकळी", defaultGats: ["401", "402"] }
            ]
          },
          {
            id: "PARNER",
            name: "Parner",
            nameMr: "पारनेर",
            villages: [
              { name: "Alkuti", nameMr: "अलकुटी", defaultGats: ["111", "112"] },
              { name: "Takli Dhokeshwar", nameMr: "टाकळी ढोकेश्वर", defaultGats: ["211", "212"] },
              { name: "Nighoj", nameMr: "निघोज", defaultGats: ["311", "312"] },
              { name: "Supe", nameMr: "सुपे", defaultGats: ["411", "412"] }
            ]
          }
        ]
      },
      {
        id: "JALGAON_DIST",
        name: "Jalgaon",
        nameMr: "जळगाव",
        talukas: [
          {
            id: "BHUSAWAL",
            name: "Bhusawal",
            nameMr: "भुसावळ",
            villages: [
              { name: "Varangaon", nameMr: "वरणगाव", defaultGats: ["191", "192", "195"] },
              { name: "Sakri", nameMr: "साक्री", defaultGats: ["291", "292"] },
              { name: "Kandari", nameMr: "कंडारी", defaultGats: ["391", "392"] },
              { name: "Fekari", nameMr: "फेकरी", defaultGats: ["491", "492"] }
            ]
          },
          {
            id: "RAVER",
            name: "Raver",
            nameMr: "रावेर",
            villages: [
              { name: "Savda", nameMr: "सावदा", defaultGats: ["195", "196"] },
              { name: "Faizpur", nameMr: "फैजपूर", defaultGats: ["295", "296"] },
              { name: "Khiroda", nameMr: "खिरोदा", defaultGats: ["395", "396"] },
              { name: "Ainpur", nameMr: "ऐनपूर", defaultGats: ["495", "496"] }
            ]
          },
          {
            id: "JALGAON_TALUKA",
            name: "Jalgaon",
            nameMr: "जळगाव तालुका",
            villages: [
              { name: "Nashirabad", nameMr: "नशिराबाद", defaultGats: ["101", "102", "105"] },
              { name: "Mhasawad", nameMr: "म्हसावद", defaultGats: ["201", "202"] },
              { name: "Asoda", nameMr: "असोदा", defaultGats: ["301", "302"] },
              { name: "Kusumba", nameMr: "कुसुंबा", defaultGats: ["401", "402"] }
            ]
          },
          {
            id: "CHALISGAON",
            name: "Chalisgaon",
            nameMr: "चाळीसगाव",
            villages: [
              { name: "Mehunbare", nameMr: "मेहुणबारे", defaultGats: ["111", "112"] },
              { name: "Bahal", nameMr: "बहाळ", defaultGats: ["211", "212"] },
              { name: "Hirapur", nameMr: "हिरापूर", defaultGats: ["311", "312"] },
              { name: "Waghli", nameMr: "वाघळी", defaultGats: ["411", "412"] }
            ]
          },
          {
            id: "CHOPDA",
            name: "Chopda",
            nameMr: "चोपडा",
            villages: [
              { name: "Adavad", nameMr: "अडावद", defaultGats: ["121", "122"] },
              { name: "Hated", nameMr: "हातेड", defaultGats: ["221", "222"] },
              { name: "Lasur", nameMr: "लासूर", defaultGats: ["321", "322"] }
            ]
          },
          {
            id: "YAWAL",
            name: "Yawal",
            nameMr: "यावल",
            villages: [
              { name: "Bhalod", nameMr: "भालोद", defaultGats: ["131", "132"] },
              { name: "Sakli", nameMr: "साकळी", defaultGats: ["231", "232"] },
              { name: "Padalsa", nameMr: "पाडळसा", defaultGats: ["331", "332"] }
            ]
          }
        ]
      },
      {
        id: "DHULE_DIST",
        name: "Dhule",
        nameMr: "धुळे",
        talukas: [
          {
            id: "DHULE_TALUKA",
            name: "Dhule",
            nameMr: "धुळे तालुका",
            villages: [
              { name: "Kusumba", nameMr: "कुसुंबा", defaultGats: ["101", "102", "105"] },
              { name: "Mohadi", nameMr: "मोहाडी", defaultGats: ["201", "202"] },
              { name: "Borkund", nameMr: "बोरकुंड", defaultGats: ["301", "302"] },
              { name: "Songir", nameMr: "सोंगीर", defaultGats: ["401", "402"] },
              { name: "Mukti", nameMr: "मुक्ती", defaultGats: ["501", "502"] }
            ]
          },
          {
            id: "SHIRPUR",
            name: "Shirpur",
            nameMr: "शिरपूर",
            villages: [
              { name: "Thalner", nameMr: "थाळनेर", defaultGats: ["111", "112"] },
              { name: "Rohini", nameMr: "रोहिणी", defaultGats: ["211", "212"] },
              { name: "Sangvi", nameMr: "सांगवी", defaultGats: ["311", "312"] },
              { name: "Boradi", nameMr: "बोराडी", defaultGats: ["411", "412"] }
            ]
          },
          {
            id: "SAKRI",
            name: "Sakri",
            nameMr: "साक्री",
            villages: [
              { name: "Pimpalner", nameMr: "पिंपळनेर", defaultGats: ["121", "122"] },
              { name: "Nizampur", nameMr: "निजामपूर", defaultGats: ["221", "222"] },
              { name: "Dahiwel", nameMr: "दहीवेल", defaultGats: ["321", "322"] }
            ]
          },
          {
            id: "SINDKHEDA",
            name: "Sindkheda",
            nameMr: "शिंदखेडा",
            villages: [
              { name: "Dondaicha", nameMr: "दोंडाईचा", defaultGats: ["131", "132"] },
              { name: "Vikhran", nameMr: "विखरण", defaultGats: ["231", "232"] },
              { name: "Chimthane", nameMr: "चिमठाणे", defaultGats: ["331", "332"] }
            ]
          }
        ]
      },
      {
        id: "NANDURBAR_DIST",
        name: "Nandurbar",
        nameMr: "नंदुरबार",
        talukas: [
          {
            id: "SHAHADA",
            name: "Shahada",
            nameMr: "शहादा",
            villages: [
              { name: "Sarangkheda", nameMr: "सारंगखेडा", defaultGats: ["101", "102"] },
              { name: "Prakasha", nameMr: "प्रकाशा", defaultGats: ["201", "202"] },
              { name: "Mandane", nameMr: "मंदणे", defaultGats: ["301", "302"] }
            ]
          },
          {
            id: "NANDURBAR_TALUKA",
            name: "Nandurbar",
            nameMr: "नंदुरबार तालुका",
            villages: [
              { name: "Ranale", nameMr: "राणाळे", defaultGats: ["111", "112"] },
              { name: "Ashte", nameMr: "आष्टे", defaultGats: ["211", "212"] },
              { name: "Khondamali", nameMr: "खोंडामळी", defaultGats: ["311", "312"] }
            ]
          },
          {
            id: "NAVAPUR",
            name: "Navapur",
            nameMr: "नवापूर",
            villages: [
              { name: "Visarwadi", nameMr: "विसरवाडी", defaultGats: ["121", "122"] },
              { name: "Khandbara", nameMr: "खांडबारा", defaultGats: ["221", "222"] },
              { name: "Chinchpada", nameMr: "चिंचपाडा", defaultGats: ["321", "322"] }
            ]
          }
        ]
      }
    ]
  },
  {
    id: "PUNE",
    name: "Pune Division",
    nameMr: "पुणे महसूल विभाग (पश्चिम महाराष्ट्र)",
    districts: [
      {
        id: "PUNE_DIST",
        name: "Pune",
        nameMr: "पुणे",
        talukas: [
          {
            id: "BARAMATI",
            name: "Baramati",
            nameMr: "बारामती",
            villages: [
              { name: "Malegaon Budruk", nameMr: "मालेगाव बुद्रुक", defaultGats: ["101", "102", "105"] },
              { name: "Koregaon", nameMr: "कोरेगाव", defaultGats: ["201", "202"] },
              { name: "Supa", nameMr: "सुपा", defaultGats: ["301", "302"] },
              { name: "Gunawadi", nameMr: "गुणवडी", defaultGats: ["401", "402"] },
              { name: "Morgaon", nameMr: "मोरगाव", defaultGats: ["501", "502"] },
              { name: "Dorlewadi", nameMr: "डोर्लेवाडी", defaultGats: ["601", "602"] },
              { name: "Songaon", nameMr: "सोनगाव", defaultGats: ["701", "702"] }
            ]
          },
          {
            id: "JUNNAR",
            name: "Junnar",
            nameMr: "जुन्नर",
            villages: [
              { name: "Narayangaon", nameMr: "नारायणगाव", defaultGats: ["111", "112", "115"] },
              { name: "Alephata", nameMr: "आळेफाटा", defaultGats: ["211", "212"] },
              { name: "Otur", nameMr: "ओतूर", defaultGats: ["311", "312", "315"] },
              { name: "Rajuri", nameMr: "राजुरी", defaultGats: ["411", "412"] },
              { name: "Belhe", nameMr: "बेल्हे", defaultGats: ["511", "512"] },
              { name: "Dingore", nameMr: "डिंगोरे", defaultGats: ["611", "612"] }
            ]
          },
          {
            id: "SHIRUR_TALUKA",
            name: "Shirur",
            nameMr: "शिरूर",
            villages: [
              { name: "Shikrapur", nameMr: "शिक्रापूर", defaultGats: ["121", "122", "125"] },
              { name: "Sanaswadi", nameMr: "सनसवाडी", defaultGats: ["221", "222"] },
              { name: "Ranjangaon", nameMr: "रांजणगाव गणपती", defaultGats: ["321", "322", "325"] },
              { name: "Talegaon Dhamdhere", nameMr: "तळेगाव ढमढेरे", defaultGats: ["421", "422"] },
              { name: "Nhaware", nameMr: "न्हावरे", defaultGats: ["521", "522"] },
              { name: "Pabal", nameMr: "पाबळ", defaultGats: ["621", "622"] }
            ]
          },
          {
            id: "HAVELI",
            name: "Haveli",
            nameMr: "हवेली",
            villages: [
              { name: "Wagholi", nameMr: "वाघोली", defaultGats: ["131", "132", "135"] },
              { name: "Uruli Kanchan", nameMr: "उरुळी कांचन", defaultGats: ["231", "232", "235"] },
              { name: "Loni Kalbhor", nameMr: "लोणी काळभोर", defaultGats: ["331", "332"] },
              { name: "Khadakwasla", nameMr: "खडकवासला", defaultGats: ["431", "432"] },
              { name: "Manjari", nameMr: "मांजरी", defaultGats: ["531", "532"] },
              { name: "Theur", nameMr: "थेऊर", defaultGats: ["631", "632"] }
            ]
          },
          {
            id: "DAUND",
            name: "Daund",
            nameMr: "दौंड",
            villages: [
              { name: "Patas", nameMr: "पाटस", defaultGats: ["141", "142"] },
              { name: "Yavat", nameMr: "यवत", defaultGats: ["241", "242"] },
              { name: "Kedgaon", nameMr: "केडगाव", defaultGats: ["341", "342"] },
              { name: "Kurkumbh", nameMr: "कुरकुंभ", defaultGats: ["441", "442"] },
              { name: "Varvand", nameMr: "वरवंड", defaultGats: ["541", "542"] }
            ]
          },
          {
            id: "INDAPUR",
            name: "Indapur",
            nameMr: "इंदापूर",
            villages: [
              { name: "Bhigwan", nameMr: "भिगवण", defaultGats: ["151", "152", "155"] },
              { name: "Bavada", nameMr: "बावडा", defaultGats: ["251", "252"] },
              { name: "Nimgaon Ketki", nameMr: "निमगाव केतकी", defaultGats: ["351", "352"] },
              { name: "Walchandnagar", nameMr: "वालचंदनगर", defaultGats: ["451", "452"] },
              { name: "Kalamb", nameMr: "कळंब", defaultGats: ["551", "552"] }
            ]
          },
          {
            id: "KHED_PUNE",
            name: "Khed (Rajgurunagar)",
            nameMr: "खेड (राजगुरूनगर)",
            villages: [
              { name: "Chakan", nameMr: "चाकण", defaultGats: ["161", "162", "165"] },
              { name: "Alandi Rural", nameMr: "आळंदी ग्रामीण", defaultGats: ["261", "262"] },
              { name: "Pait", nameMr: "पाईट", defaultGats: ["361", "362"] },
              { name: "Kadus", nameMr: "कडूस", defaultGats: ["461", "462"] }
            ]
          },
          {
            id: "PURANDAR",
            name: "Purandar (Saswad)",
            nameMr: "पुरंदर (सासवड)",
            villages: [
              { name: "Saswad Rural", nameMr: "सासवड ग्रामीण", defaultGats: ["171", "172"] },
              { name: "Jejuri", nameMr: "जेजुरी", defaultGats: ["271", "272"] },
              { name: "Nira", nameMr: "नीरा", defaultGats: ["371", "372"] },
              { name: "Valha", nameMr: "वाल्हा", defaultGats: ["471", "472"] }
            ]
          }
        ]
      },
      {
        id: "SATARA_DIST",
        name: "Satara",
        nameMr: "सातारा",
        talukas: [
          {
            id: "KARAD",
            name: "Karad",
            nameMr: "कराड",
            villages: [
              { name: "Malkapur", nameMr: "मलकापूर", defaultGats: ["131", "132"] },
              { name: "Umbraj", nameMr: "उंब्रज", defaultGats: ["231", "232", "235"] },
              { name: "Masur", nameMr: "मसूर", defaultGats: ["331", "332"] },
              { name: "Shenoli", nameMr: "शेणोली", defaultGats: ["431", "432"] },
              { name: "Kole", nameMr: "कोळे", defaultGats: ["531", "532"] },
              { name: "Kale", nameMr: "काळे", defaultGats: ["631", "632"] }
            ]
          },
          {
            id: "PHALTAN",
            name: "Phaltan",
            nameMr: "फलटण",
            villages: [
              { name: "Lonand", nameMr: "लोणंद", defaultGats: ["141", "142", "145"] },
              { name: "Taradgaon", nameMr: "तरडगाव", defaultGats: ["241", "242"] },
              { name: "Sakharwadi", nameMr: "साखरवाडी", defaultGats: ["341", "342"] },
              { name: "Girvi", nameMr: "गिरवी", defaultGats: ["441", "442"] },
              { name: "Vidani", nameMr: "विडणी", defaultGats: ["541", "542"] },
              { name: "Barad", nameMr: "बरड", defaultGats: ["641", "642"] }
            ]
          },
          {
            id: "SATARA_TALUKA",
            name: "Satara",
            nameMr: "सातारा तालुका",
            villages: [
              { name: "Shendre", nameMr: "शेंद्रे", defaultGats: ["101", "102"] },
              { name: "Degam", nameMr: "देगाव", defaultGats: ["201", "202"] },
              { name: "Nagthane", nameMr: "नागठाणे", defaultGats: ["301", "302"] },
              { name: "Borgaon", nameMr: "बोरगाव", defaultGats: ["401", "402"] }
            ]
          },
          {
            id: "WAI",
            name: "Wai",
            nameMr: "वाई",
            villages: [
              { name: "Bhuinj", nameMr: "भुईंज", defaultGats: ["111", "112"] },
              { name: "Bavdhan", nameMr: "बावधन", defaultGats: ["211", "212"] },
              { name: "Surur", nameMr: "सुरुर्", defaultGats: ["311", "312"] },
              { name: "Shirwal", nameMr: "शिरवळ", defaultGats: ["411", "412"] }
            ]
          }
        ]
      },
      {
        id: "SOLAPUR_DIST",
        name: "Solapur",
        nameMr: "सोलापूर",
        talukas: [
          {
            id: "PANDHARPUR",
            name: "Pandharpur",
            nameMr: "पंढरपूर",
            villages: [
              { name: "Kasegaon", nameMr: "कासेगाव", defaultGats: ["151", "152", "155"] },
              { name: "Bhalwani", nameMr: "भालवणी", defaultGats: ["251", "252"] },
              { name: "Karkamb", nameMr: "करकंब", defaultGats: ["351", "352", "355"] },
              { name: "Tungat", nameMr: "तुंगत", defaultGats: ["451", "452"] },
              { name: "Patwardhan Kuroli", nameMr: "पटवर्धन कुरोली", defaultGats: ["551", "552"] },
              { name: "Gadegaon", nameMr: "गाडेगाव", defaultGats: ["651", "652"] },
              { name: "Korti", nameMr: "कोर्टी", defaultGats: ["751", "752"] }
            ]
          },
          {
            id: "BARSHI",
            name: "Barshi",
            nameMr: "बार्शी",
            villages: [
              { name: "Vairag", nameMr: "वैराग", defaultGats: ["161", "162", "165"] },
              { name: "Pangri", nameMr: "पांगरी", defaultGats: ["261", "262"] },
              { name: "Uple", nameMr: "उपळे", defaultGats: ["361", "362"] },
              { name: "Gaudgaon", nameMr: "गौडगाव", defaultGats: ["461", "462"] }
            ]
          },
          {
            id: "MALSHIRAS",
            name: "Malshiras",
            nameMr: "माळशिरस",
            villages: [
              { name: "Akluj", nameMr: "अकलूज", defaultGats: ["101", "102", "105"] },
              { name: "Natepute", nameMr: "नातेपुते", defaultGats: ["201", "202"] },
              { name: "Velapur", nameMr: "वेळापूर", defaultGats: ["301", "302"] },
              { name: "Mahalung", nameMr: "महाळुंग", defaultGats: ["401", "402"] },
              { name: "Piliv", nameMr: "पिळिव", defaultGats: ["501", "502"] }
            ]
          },
          {
            id: "MADHA",
            name: "Madha",
            nameMr: "माढा",
            villages: [
              { name: "Kurduvadi", nameMr: "कुर्डुवाडी", defaultGats: ["111", "112"] },
              { name: "Modnimb", nameMr: "मोडनिंब", defaultGats: ["211", "212"] },
              { name: "Tembhurni", nameMr: "टेंभुर्णी", defaultGats: ["311", "312", "315"] }
            ]
          },
          {
            id: "SANGOLA",
            name: "Sangola",
            nameMr: "सांगोला",
            villages: [
              { name: "Nazare", nameMr: "नझरे", defaultGats: ["121", "122"] },
              { name: "Javale", nameMr: "जवळे", defaultGats: ["221", "222"] },
              { name: "Mahud", nameMr: "महुद", defaultGats: ["321", "322"] },
              { name: "Kadlas", nameMr: "कडलास", defaultGats: ["421", "422"] }
            ]
          }
        ]
      },
      {
        id: "KOLHAPUR_DIST",
        name: "Kolhapur",
        nameMr: "कोल्हापूर",
        talukas: [
          {
            id: "KARVEER",
            name: "Karveer",
            nameMr: "करवीर",
            villages: [
              { name: "Uchgaon", nameMr: "उचगाव", defaultGats: ["101", "102"] },
              { name: "Gandhinagar", nameMr: "गांधीनगर", defaultGats: ["201", "202"] },
              { name: "Vashi", nameMr: "वाशी", defaultGats: ["301", "302"] },
              { name: "Ujalaiwadi", nameMr: "उजळाईवाडी", defaultGats: ["401", "402"] },
              { name: "Kuditre", nameMr: "कुडित्रे", defaultGats: ["501", "502"] }
            ]
          },
          {
            id: "HATKANANGLE",
            name: "Hatkanangle",
            nameMr: "हातकणंगले",
            villages: [
              { name: "Hupari", nameMr: "हुपरी", defaultGats: ["111", "112", "115"] },
              { name: "Rendal", nameMr: "रेंदाळ", defaultGats: ["211", "212"] },
              { name: "Shiroli MIDC", nameMr: "शिरोली एमआयडीसी", defaultGats: ["311", "312"] },
              { name: "Pattankodoli", nameMr: "पट्टणकोडोली", defaultGats: ["411", "412"] },
              { name: "Rukadi", nameMr: "रुकडी", defaultGats: ["511", "512"] }
            ]
          },
          {
            id: "SHIROL",
            name: "Shirol",
            nameMr: "शिरोळ",
            villages: [
              { name: "Jaysingpur Rural", nameMr: "जयसिंगपूर ग्रामीण", defaultGats: ["121", "122"] },
              { name: "Nrusinhawadi", nameMr: "नृसिंहवाडी (नरसोबाची वाडी)", defaultGats: ["221", "222"] },
              { name: "Kurundwad", nameMr: "कुरुंदवाड", defaultGats: ["321", "322"] },
              { name: "Danoli", nameMr: "दांनोली", defaultGats: ["421", "422"] },
              { name: "Nandani", nameMr: "नांदणी", defaultGats: ["521", "522"] }
            ]
          },
          {
            id: "KAGAL",
            name: "Kagal",
            nameMr: "कागल",
            villages: [
              { name: "Murgud", nameMr: "मुरगूड", defaultGats: ["131", "132"] },
              { name: "Bidri", nameMr: "बिद्री", defaultGats: ["231", "232"] },
              { name: "Kapashi", nameMr: "सेनापती कापशी", defaultGats: ["331", "332"] },
              { name: "Sangaon", nameMr: "सांगाव", defaultGats: ["431", "432"] }
            ]
          }
        ]
      },
      {
        id: "SANGLI_DIST",
        name: "Sangli",
        nameMr: "सांगली",
        talukas: [
          {
            id: "MIRAJ",
            name: "Miraj",
            nameMr: "मिरज",
            villages: [
              { name: "Kupwad", nameMr: "कुपवाड", defaultGats: ["101", "102"] },
              { name: "Bedag", nameMr: "बेडग", defaultGats: ["201", "202"] },
              { name: "Erandoli", nameMr: "एरंडोली", defaultGats: ["301", "302"] },
              { name: "Arag", nameMr: "आरग", defaultGats: ["401", "402"] },
              { name: "Malgaon", nameMr: "माळगाव", defaultGats: ["501", "502"] }
            ]
          },
          {
            id: "WALWA_ISLAMPUR",
            name: "Walwa (Islampur)",
            nameMr: "वाळवा (इस्लामपूर)",
            villages: [
              { name: "Peth", nameMr: "पेठ", defaultGats: ["111", "112"] },
              { name: "Takari", nameMr: "ताकारी", defaultGats: ["211", "212"] },
              { name: "Kasegaon", nameMr: "कासेगाव", defaultGats: ["311", "312"] },
              { name: "Bahe", nameMr: "बाहे", defaultGats: ["411", "412"] }
            ]
          },
          {
            id: "TASGAON",
            name: "Tasgaon",
            nameMr: "तासगाव",
            villages: [
              { name: "Savlaj", nameMr: "सावळज", defaultGats: ["121", "122"] },
              { name: "Manerajuri", nameMr: "मणेराजुरी", defaultGats: ["221", "222"] },
              { name: "Visapur", nameMr: "विसापूर", defaultGats: ["321", "322"] },
              { name: "Nimani", nameMr: "निमाणी", defaultGats: ["421", "422"] }
            ]
          },
          {
            id: "JAT",
            name: "Jat",
            nameMr: "जत",
            villages: [
              { name: "Sankh", nameMr: "सांख", defaultGats: ["131", "132"] },
              { name: "Umadi", nameMr: "उमदी", defaultGats: ["231", "232"] },
              { name: "Shegaon", nameMr: "शेगाव", defaultGats: ["331", "332"] },
              { name: "Madgyal", nameMr: "मडग्याळ", defaultGats: ["431", "432"] }
            ]
          }
        ]
      }
    ]
  },
  {
    id: "CHHATRAPATI_SAMBHAJINAGAR",
    name: "Chhatrapati Sambhajinagar Division",
    nameMr: "छत्रपती संभाजीनगर महसूल विभाग (मराठवाडा)",
    districts: [
      {
        id: "SAMBHAJINAGAR_DIST",
        name: "Chhatrapati Sambhajinagar",
        nameMr: "छत्रपती संभाजीनगर (औरंगाबाद)",
        talukas: [
          {
            id: "PAITHAN",
            name: "Paithan",
            nameMr: "पैठण",
            villages: [
              { name: "Pimpalwadi", nameMr: "पिंपळवाडी", defaultGats: ["101", "102"] },
              { name: "Bhadli", nameMr: "भादली", defaultGats: ["201", "202"] },
              { name: "Bidkin", nameMr: "बिडकीन", defaultGats: ["301", "302", "305"] },
              { name: "Navgaon", nameMr: "नवगाव", defaultGats: ["401", "402"] },
              { name: "Adul", nameMr: "आडूळ", defaultGats: ["501", "502"] },
              { name: "Pachod", nameMr: "पाचोड", defaultGats: ["601", "602"] },
              { name: "Dhorkin", nameMr: "धोरकीन", defaultGats: ["701", "702"] }
            ]
          },
          {
            id: "GANGAPUR",
            name: "Gangapur",
            nameMr: "गंगापूर",
            villages: [
              { name: "Bhenda", nameMr: "भेंडा", defaultGats: ["111", "112"] },
              { name: "Lasur Station", nameMr: "लासूर स्टेशन", defaultGats: ["211", "212", "215"] },
              { name: "Shillegaon", nameMr: "शिल्लेगाव", defaultGats: ["311", "312"] },
              { name: "Waluj", nameMr: "वाळूज", defaultGats: ["411", "412"] },
              { name: "Turkabad", nameMr: "तुर्काबाद", defaultGats: ["511", "512"] }
            ]
          },
          {
            id: "VAIJAPUR",
            name: "Vaijapur",
            nameMr: "वैजापूर",
            villages: [
              { name: "Rotegaon", nameMr: "रोटेगाव", defaultGats: ["121", "122"] },
              { name: "Shiur", nameMr: "शिऊर", defaultGats: ["221", "222"] },
              { name: "Babhalgaon", nameMr: "बाभळगाव", defaultGats: ["321", "322"] },
              { name: "Mahalgaon", nameMr: "महालगाव", defaultGats: ["421", "422"] },
              { name: "Borsar", nameMr: "बोरसर", defaultGats: ["521", "522"] }
            ]
          },
          {
            id: "SILLOD",
            name: "Sillod",
            nameMr: "सिल्लोड",
            villages: [
              { name: "Golegaon", nameMr: "गोळेगाव", defaultGats: ["131", "132"] },
              { name: "Ajanta", nameMr: "अजिंठा", defaultGats: ["231", "232"] },
              { name: "Bharadi", nameMr: "भराडी", defaultGats: ["331", "332"] },
              { name: "Shivna", nameMr: "शिवना", defaultGats: ["431", "432"] }
            ]
          },
          {
            id: "KANNAD",
            name: "Kannad",
            nameMr: "कन्नड",
            villages: [
              { name: "Pishor", nameMr: "पिशोर", defaultGats: ["141", "142"] },
              { name: "Devgaon Rangari", nameMr: "देवगाव रंगारी", defaultGats: ["241", "242"] },
              { name: "Nachanvel", nameMr: "नाचनवेल", defaultGats: ["341", "342"] }
            ]
          }
        ]
      },
      {
        id: "JALNA_DIST",
        name: "Jalna",
        nameMr: "जालना",
        talukas: [
          {
            id: "AMBAD",
            name: "Ambad",
            nameMr: "अंबड",
            villages: [
              { name: "Wadigodri", nameMr: "वडीगोद्री", defaultGats: ["131", "132"] },
              { name: "Shahagad", nameMr: "शहागड", defaultGats: ["231", "232"] },
              { name: "Ankushnagar", nameMr: "अंकुशनगर", defaultGats: ["331", "332"] },
              { name: "Rohilagad", nameMr: "रोहिलागड", defaultGats: ["431", "432"] },
              { name: "Gondi", nameMr: "गोंदी", defaultGats: ["531", "532"] }
            ]
          },
          {
            id: "PARTUR",
            name: "Partur",
            nameMr: "परतूर",
            villages: [
              { name: "Ashti", nameMr: "आष्टी", defaultGats: ["141", "142"] },
              { name: "Watur", nameMr: "वाटूर", defaultGats: ["241", "242"] },
              { name: "Shirasgaon", nameMr: "शिरसगाव", defaultGats: ["341", "342"] }
            ]
          },
          {
            id: "GHANSAWANGI",
            name: "Ghansawangi",
            nameMr: "घनसावंगी",
            villages: [
              { name: "Kumbhar Pimpalgaon", nameMr: "कुंभार पिंपळगाव", defaultGats: ["151", "152"] },
              { name: "Antarwali Sarati", nameMr: "अंतरवाली सराटी", defaultGats: ["251", "252"] },
              { name: "Tirthpuri", nameMr: "तीर्थपुरी", defaultGats: ["351", "352"] },
              { name: "Rani Unchegaon", nameMr: "राणी उंचेगाव", defaultGats: ["451", "452"] }
            ]
          },
          {
            id: "BHOKARDAN",
            name: "Bhokardan",
            nameMr: "भोकरदन",
            villages: [
              { name: "Hasnabad", nameMr: "हसनाबाद", defaultGats: ["161", "162"] },
              { name: "Rajur", nameMr: "राजूर", defaultGats: ["261", "262"] },
              { name: "Anwa", nameMr: "अनवा", defaultGats: ["361", "362"] }
            ]
          }
        ]
      },
      {
        id: "BEED_DIST",
        name: "Beed",
        nameMr: "बीड",
        talukas: [
          {
            id: "GEORAI",
            name: "Georai",
            nameMr: "गेवराई",
            villages: [
              { name: "Umapur", nameMr: "उमापूर", defaultGats: ["151", "152"] },
              { name: "Talwada", nameMr: "तळवाडा", defaultGats: ["251", "252"] },
              { name: "Chaklamba", nameMr: "चकलांबा", defaultGats: ["351", "352"] },
              { name: "Madalmohi", nameMr: "मादळमोही", defaultGats: ["451", "452"] },
              { name: "Sirasdevi", nameMr: "शिरसदेवी", defaultGats: ["551", "552"] }
            ]
          },
          {
            id: "MAJALGAON",
            name: "Majalgaon",
            nameMr: "माजलगाव",
            villages: [
              { name: "Kesapuri", nameMr: "केसपुरी", defaultGats: ["161", "162"] },
              { name: "Gangamasla", nameMr: "गंगामसला", defaultGats: ["261", "262"] },
              { name: "Kitti Aadgaon", nameMr: "किट्टी आडगाव", defaultGats: ["361", "362"] },
              { name: "Talkhed", nameMr: "ताळखेड", defaultGats: ["461", "462"] }
            ]
          },
          {
            id: "BEED_TALUKA",
            name: "Beed",
            nameMr: "बीड तालुका",
            villages: [
              { name: "Chousala", nameMr: "चौसाळा", defaultGats: ["101", "102"] },
              { name: "Neknoor", nameMr: "नेकनूर", defaultGats: ["201", "202"] },
              { name: "Limba Ganesh", nameMr: "लिंबा गणेश", defaultGats: ["301", "302"] },
              { name: "Pali", nameMr: "पाली", defaultGats: ["401", "402"] }
            ]
          },
          {
            id: "PARLI",
            name: "Parli Vaijnath",
            nameMr: "परळी वैजनाथ",
            villages: [
              { name: "Dharmapuri", nameMr: "धर्मापुरी", defaultGats: ["111", "112"] },
              { name: "Sirsala", nameMr: "सिरसाळा", defaultGats: ["211", "212"] },
              { name: "Tokwadi", nameMr: "टोकवाडी", defaultGats: ["311", "312"] }
            ]
          },
          {
            id: "AMBAJOGAI",
            name: "Ambajogai",
            nameMr: "अंबाजोगाई",
            villages: [
              { name: "Bardapur", nameMr: "बर्दापूर", defaultGats: ["121", "122"] },
              { name: "Lokhandi Sawargaon", nameMr: "लोखंडी सावरगाव", defaultGats: ["221", "222"] },
              { name: "Ghatnandur", nameMr: "घाटनांदूर", defaultGats: ["321", "322"] }
            ]
          }
        ]
      },
      {
        id: "LATUR_DIST",
        name: "Latur",
        nameMr: "लातूर",
        talukas: [
          {
            id: "LATUR_TALUKA",
            name: "Latur",
            nameMr: "लातूर तालुका",
            villages: [
              { name: "Murud", nameMr: "मुरुड", defaultGats: ["101", "102", "105"] },
              { name: "Harangul", nameMr: "हरंगुळ", defaultGats: ["201", "202"] },
              { name: "Babhalgaon", nameMr: "बाभळगाव", defaultGats: ["301", "302"] },
              { name: "Gategaon", nameMr: "गातेगाव", defaultGats: ["401", "402"] }
            ]
          },
          {
            id: "AUSA",
            name: "Ausa",
            nameMr: "औसा",
            villages: [
              { name: "Killari", nameMr: "किल्लारी", defaultGats: ["111", "112"] },
              { name: "Lamjana", nameMr: "लामजना", defaultGats: ["211", "212"] },
              { name: "Matola", nameMr: "मातोळा", defaultGats: ["311", "312"] },
              { name: "Belkund", nameMr: "बेलकुंड", defaultGats: ["411", "412"] }
            ]
          },
          {
            id: "UDGIR",
            name: "Udgir",
            nameMr: "उदगीर",
            villages: [
              { name: "Nalegaon", nameMr: "नाळेगाव", defaultGats: ["121", "122"] },
              { name: "Her", nameMr: "हेर", defaultGats: ["221", "222"] },
              { name: "Tondar", nameMr: "तोंडार", defaultGats: ["321", "322"] }
            ]
          },
          {
            id: "NILANGA",
            name: "Nilanga",
            nameMr: "निलंगा",
            villages: [
              { name: "Aurad Shahajani", nameMr: "औराद शहाजानी", defaultGats: ["131", "132"] },
              { name: "Kasar Sirsi", nameMr: "कासार सिरसी", defaultGats: ["231", "232"] }
            ]
          }
        ]
      },
      {
        id: "NANDED_DIST",
        name: "Nanded",
        nameMr: "नांदेड",
        talukas: [
          {
            id: "NANDED_TALUKA",
            name: "Nanded",
            nameMr: "नांदेड तालुका",
            villages: [
              { name: "Vishnupuri", nameMr: "विष्णुपूरी", defaultGats: ["101", "102"] },
              { name: "Tuppa", nameMr: "तुप्पा", defaultGats: ["201", "202"] },
              { name: "Limbgaon", nameMr: "लिंबगाव", defaultGats: ["301", "302"] }
            ]
          },
          {
            id: "MUKHED",
            name: "Mukhed",
            nameMr: "मुखेड",
            villages: [
              { name: "Jambhali", nameMr: "जांभळी", defaultGats: ["111", "112"] },
              { name: "Barhali", nameMr: "बर्हाळी", defaultGats: ["211", "212"] }
            ]
          },
          {
            id: "DEGLOOR",
            name: "Degloor",
            nameMr: "देगलूर",
            villages: [
              { name: "Karadkhed", nameMr: "कराडखेड", defaultGats: ["121", "122"] },
              { name: "Hanegaon", nameMr: "हाणेगाव", defaultGats: ["221", "222"] }
            ]
          },
          {
            id: "LOHA",
            name: "Loha",
            nameMr: "लोहा",
            villages: [
              { name: "Malakoli", nameMr: "मलकोळी", defaultGats: ["131", "132"] },
              { name: "Sonkhed", nameMr: "सोनखेड", defaultGats: ["231", "232"] },
              { name: "Kalambar", nameMr: "कळंबर", defaultGats: ["331", "332"] }
            ]
          }
        ]
      },
      {
        id: "DHARASHIV_DIST",
        name: "Dharashiv",
        nameMr: "धाराशिव (उस्मानाबाद)",
        talukas: [
          {
            id: "DHARASHIV_TALUKA",
            name: "Dharashiv",
            nameMr: "धाराशिव तालुका",
            villages: [
              { name: "Ter", nameMr: "तेर", defaultGats: ["101", "102"] },
              { name: "Dhoki", nameMr: "ढोकी", defaultGats: ["201", "202"] },
              { name: "Yedshi", nameMr: "येडशी", defaultGats: ["301", "302"] }
            ]
          },
          {
            id: "TULJAPUR",
            name: "Tuljapur",
            nameMr: "तुळजापूर",
            villages: [
              { name: "Naldurg", nameMr: "नळदुर्ग", defaultGats: ["111", "112"] },
              { name: "Kati", nameMr: "काटी", defaultGats: ["211", "212"] },
              { name: "Salgara", nameMr: "साळगरा", defaultGats: ["311", "312"] }
            ]
          },
          {
            id: "OMERGA",
            name: "Omerga",
            nameMr: "उमरगा",
            villages: [
              { name: "Murum", nameMr: "मुरुम", defaultGats: ["121", "122"] },
              { name: "Dalimb", nameMr: "डाळिंब", defaultGats: ["221", "222"] },
              { name: "Gunjoti", nameMr: "गुंजोटी", defaultGats: ["321", "322"] }
            ]
          }
        ]
      },
      {
        id: "PARBHANI_DIST",
        name: "Parbhani",
        nameMr: "परभणी",
        talukas: [
          {
            id: "PARBHANI_TALUKA",
            name: "Parbhani",
            nameMr: "परभणी तालुका",
            villages: [
              { name: "Zari", nameMr: "झरी", defaultGats: ["101", "102"] },
              { name: "Pedgaon", nameMr: "पेडगाव", defaultGats: ["201", "202"] },
              { name: "Singnapur", nameMr: "शिंगणापूर", defaultGats: ["301", "302"] }
            ]
          },
          {
            id: "GANGAKHED",
            name: "Gangakhed",
            nameMr: "गंगाखेड",
            villages: [
              { name: "Ranisawargaon", nameMr: "राणीसावरगाव", defaultGats: ["111", "112"] },
              { name: "Mahatpuri", nameMr: "माहतपुरी", defaultGats: ["211", "212"] }
            ]
          },
          {
            id: "JINTUR",
            name: "Jintur",
            nameMr: "जिंतूर",
            villages: [
              { name: "Bori", nameMr: "बोरी", defaultGats: ["121", "122"] },
              { name: "Charthana", nameMr: "चारठाणा", defaultGats: ["221", "222"] }
            ]
          }
        ]
      },
      {
        id: "HINGOLI_DIST",
        name: "Hingoli",
        nameMr: "हिंगोली",
        talukas: [
          {
            id: "BASMATH",
            name: "Basmath",
            nameMr: "वसमत",
            villages: [
              { name: "Hatta", nameMr: "हट्टा", defaultGats: ["101", "102"] },
              { name: "Kurunda", nameMr: "कुरुंदा", defaultGats: ["201", "202"] }
            ]
          },
          {
            id: "AUNDHA_NAGNATH",
            name: "Aundha Nagnath",
            nameMr: "औंढा नागनाथ",
            villages: [
              { name: "Aundha Rural", nameMr: "औंढा ग्रामीण", defaultGats: ["111", "112"] },
              { name: "Pardi", nameMr: "पार्डी", defaultGats: ["211", "212"] }
            ]
          }
        ]
      }
    ]
  },
  {
    id: "AMRAVATI",
    name: "Amravati Division",
    nameMr: "अमरावती महसूल विभाग (पश्चिम विदर्भ)",
    districts: [
      {
        id: "AMRAVATI_DIST",
        name: "Amravati",
        nameMr: "अमरावती",
        talukas: [
          {
            id: "ACHALPUR",
            name: "Achalpur",
            nameMr: "अचलपूर (परतवाडा)",
            villages: [
              { name: "Paratwada", nameMr: "परतवाडा", defaultGats: ["101", "102"] },
              { name: "Kandli", nameMr: "कांडली", defaultGats: ["201", "202"] },
              { name: "Shirasgaon Kasba", nameMr: "शिरसगाव कासबा", defaultGats: ["301", "302"] },
              { name: "Pathrot", nameMr: "पाथ्रोट", defaultGats: ["401", "402"] },
              { name: "Assegaon", nameMr: "आसेगाव", defaultGats: ["501", "502"] }
            ]
          },
          {
            id: "CHANDUR_RAILWAY",
            name: "Chandur Railway",
            nameMr: "चांदूर रेल्वे",
            villages: [
              { name: "Pohra", nameMr: "पोहरा", defaultGats: ["201", "202"] },
              { name: "Amla", nameMr: "आमला", defaultGats: ["301", "302"] },
              { name: "Dighi", nameMr: "दिघी", defaultGats: ["401", "402"] }
            ]
          },
          {
            id: "MORSHI",
            name: "Morshi",
            nameMr: "मोर्शी",
            villages: [
              { name: "Rithpur", nameMr: "रिद्धपूर", defaultGats: ["111", "112"] },
              { name: "Ner Pingalai", nameMr: "नेर पिंगळाई", defaultGats: ["211", "212"] },
              { name: "Dhamangaon", nameMr: "धामणगाव", defaultGats: ["311", "312"] }
            ]
          },
          {
            id: "WARUD",
            name: "Warud",
            nameMr: "वरूड",
            villages: [
              { name: "Shendurjana Ghat", nameMr: "शेंदुरजना घाट", defaultGats: ["121", "122"] },
              { name: "Jarud", nameMr: "जारुड", defaultGats: ["221", "222"] },
              { name: "Benoda", nameMr: "बेनोडा", defaultGats: ["321", "322"] }
            ]
          },
          {
            id: "ANJANGAON_SURJI",
            name: "Anjangaon Surji",
            nameMr: "अंजनगाव सुर्जी",
            villages: [
              { name: "Kapustalni", nameMr: "कापूसतळणी", defaultGats: ["131", "132"] },
              { name: "Panaj", nameMr: "पानांज", defaultGats: ["231", "232"] }
            ]
          }
        ]
      },
      {
        id: "YAVATMAL_DIST",
        name: "Yavatmal",
        nameMr: "यवतमाळ",
        talukas: [
          {
            id: "PUSAD",
            name: "Pusad",
            nameMr: "पुसद",
            villages: [
              { name: "Gahuli", nameMr: "गहुली", defaultGats: ["111", "112"] },
              { name: "Shembalpimpri", nameMr: "शेंबाळपिंप्री", defaultGats: ["211", "212"] },
              { name: "Vasantnagar", nameMr: "वसंतनगर", defaultGats: ["311", "312"] },
              { name: "Fulsawangi", nameMr: "फुलसावंगी", defaultGats: ["411", "412"] }
            ]
          },
          {
            id: "YAVATMAL_TALUKA",
            name: "Yavatmal",
            nameMr: "यवतमाळ तालुका",
            villages: [
              { name: "Lohara", nameMr: "लोहारा", defaultGats: ["101", "102"] },
              { name: "Bhoyar", nameMr: "भोयर", defaultGats: ["201", "202"] },
              { name: "Umarsara", nameMr: "उमरसरा", defaultGats: ["301", "302"] }
            ]
          },
          {
            id: "DIGRAS",
            name: "Digras",
            nameMr: "दिग्रस",
            villages: [
              { name: "Kalamb Road", nameMr: "कळंब रोड", defaultGats: ["121", "122"] },
              { name: "Singad", nameMr: "सिंगद", defaultGats: ["221", "222"] }
            ]
          },
          {
            id: "WANI",
            name: "Wani",
            nameMr: "वणी",
            villages: [
              { name: "Punwat", nameMr: "पुणवट", defaultGats: ["131", "132"] },
              { name: "Kayar", nameMr: "कायर", defaultGats: ["231", "232"] },
              { name: "Shirpur", nameMr: "शिरपूर", defaultGats: ["331", "332"] }
            ]
          }
        ]
      },
      {
        id: "AKOLA_DIST",
        name: "Akola",
        nameMr: "अकोला",
        talukas: [
          {
            id: "AKOLA_TALUKA",
            name: "Akola",
            nameMr: "अकोला तालुका",
            villages: [
              { name: "Shivani", nameMr: "शिवणी", defaultGats: ["101", "102"] },
              { name: "Kapshi", nameMr: "कापशी", defaultGats: ["201", "202"] },
              { name: "Borgaon Manju", nameMr: "बोरगाव मंजू", defaultGats: ["301", "302"] },
              { name: "Ugwa", nameMr: "उगवा", defaultGats: ["401", "402"] }
            ]
          },
          {
            id: "AKOT",
            name: "Akot",
            nameMr: "अकोट",
            villages: [
              { name: "Hiwarkhed", nameMr: "हिवरखेड", defaultGats: ["111", "112"] },
              { name: "Chohatta Bazar", nameMr: "चोहट्टा बाजार", defaultGats: ["211", "212"] },
              { name: "Kutasa", nameMr: "कुटासा", defaultGats: ["311", "312"] }
            ]
          },
          {
            id: "BALAPUR",
            name: "Balapur",
            nameMr: "बाळापूर",
            villages: [
              { name: "Paras", nameMr: "पारस", defaultGats: ["121", "122"] },
              { name: "Wadegaon", nameMr: "वाडेगाव", defaultGats: ["221", "222"] },
              { name: "Ural", nameMr: "उरळ", defaultGats: ["321", "322"] }
            ]
          }
        ]
      },
      {
        id: "BULDHANA_DIST",
        name: "Buldhana",
        nameMr: "बुलढाणा",
        talukas: [
          {
            id: "KHAMGAON",
            name: "Khamgaon",
            nameMr: "खामगाव",
            villages: [
              { name: "Jalamb", nameMr: "जलंब", defaultGats: ["101", "102"] },
              { name: "Rohinkhed", nameMr: "रोहिणखेड", defaultGats: ["201", "202"] },
              { name: "Pimpalgaon Raja", nameMr: "पिंपळगाव राजा", defaultGats: ["301", "302"] },
              { name: "Sutala", nameMr: "सुताळा", defaultGats: ["401", "402"] }
            ]
          },
          {
            id: "SHEGAON",
            name: "Shegaon",
            nameMr: "शेगाव",
            villages: [
              { name: "Manasgaon", nameMr: "मानसगाव", defaultGats: ["111", "112"] },
              { name: "Matargaon", nameMr: "मातरगाव", defaultGats: ["211", "212"] }
            ]
          },
          {
            id: "MALKAPUR_BULDHANA",
            name: "Malkapur",
            nameMr: "मलकापूर",
            villages: [
              { name: "Datala", nameMr: "दाताळा", defaultGats: ["121", "122"] },
              { name: "Wadoda", nameMr: "वदोडा", defaultGats: ["221", "222"] },
              { name: "Dharangaon", nameMr: "धरणगाव", defaultGats: ["321", "322"] }
            ]
          },
          {
            id: "MEHKAR",
            name: "Mehkar",
            nameMr: "मेहकर",
            villages: [
              { name: "Janephal", nameMr: "जानेफळ", defaultGats: ["131", "132"] },
              { name: "Dongaon", nameMr: "डोणगाव", defaultGats: ["231", "232"] },
              { name: "Sultanpur", nameMr: "सुलतानपूर", defaultGats: ["331", "332"] }
            ]
          },
          {
            id: "CHIKHLI",
            name: "Chikhli",
            nameMr: "चिखली",
            villages: [
              { name: "Undri", nameMr: "उंद्री", defaultGats: ["141", "142"] },
              { name: "Mera Khurd", nameMr: "मेरा खुर्द", defaultGats: ["241", "242"] },
              { name: "Amdapur", nameMr: "आमडापूर", defaultGats: ["341", "342"] }
            ]
          }
        ]
      },
      {
        id: "WASHIM_DIST",
        name: "Washim",
        nameMr: "वाशिम",
        talukas: [
          {
            id: "WASHIM_TALUKA",
            name: "Washim",
            nameMr: "वाशिम तालुका",
            villages: [
              { name: "Sawargaon", nameMr: "सावरगाव", defaultGats: ["101", "102"] },
              { name: "Ansing", nameMr: "अनसिंग", defaultGats: ["201", "202"] },
              { name: "Kata", nameMr: "काटा", defaultGats: ["301", "302"] },
              { name: "Shirpur Jain", nameMr: "शिरपूर जैन", defaultGats: ["401", "402"] }
            ]
          },
          {
            id: "RISOD",
            name: "Risod",
            nameMr: "रिसोड",
            villages: [
              { name: "Kenwad", nameMr: "केनवड", defaultGats: ["111", "112"] },
              { name: "Asegaon Pen", nameMr: "आसेगाव पेन", defaultGats: ["211", "212"] },
              { name: "Haral", nameMr: "हराळ", defaultGats: ["311", "312"] }
            ]
          },
          {
            id: "KARANJA_LAD",
            name: "Karanja Lad",
            nameMr: "कारंजा लाड",
            villages: [
              { name: "Kamtha", nameMr: "कामठा", defaultGats: ["121", "122"] },
              { name: "Pohradevi", nameMr: "पोहरादेवी", defaultGats: ["221", "222"] }
            ]
          }
        ]
      }
    ]
  },
  {
    id: "NAGPUR",
    name: "Nagpur Division",
    nameMr: "नागपूर महसूल विभाग (पूर्व विदर्भ)",
    districts: [
      {
        id: "NAGPUR_DIST",
        name: "Nagpur",
        nameMr: "नागपूर",
        talukas: [
          {
            id: "NAGPUR_RURAL",
            name: "Nagpur Rural",
            nameMr: "नागपूर ग्रामीण",
            villages: [
              { name: "Wadi", nameMr: "वाडी", defaultGats: ["101", "102"] },
              { name: "Besa", nameMr: "बेसा", defaultGats: ["201", "202"] },
              { name: "Pipla", nameMr: "पिंपळा", defaultGats: ["301", "302"] },
              { name: "Koradi", nameMr: "कोराडी", defaultGats: ["401", "402"] },
              { name: "Butibori", nameMr: "बुटीबोरी", defaultGats: ["501", "502"] }
            ]
          },
          {
            id: "SAONER",
            name: "Saoner",
            nameMr: "सावनेर",
            villages: [
              { name: "Khapa", nameMr: "खापा", defaultGats: ["111", "112"] },
              { name: "Kelwad", nameMr: "केळवद", defaultGats: ["211", "212"] },
              { name: "Patansaongi", nameMr: "पाटणसावंगी", defaultGats: ["311", "312"] },
              { name: "Dhapewada", nameMr: "धापेवाडा", defaultGats: ["411", "412"] }
            ]
          },
          {
            id: "KATOL",
            name: "Katol",
            nameMr: "काटोल",
            villages: [
              { name: "Kondhali", nameMr: "कोंढाळी", defaultGats: ["121", "122"] },
              { name: "Ridhora", nameMr: "रिढोरा", defaultGats: ["221", "222"] },
              { name: "Paradsinga", nameMr: "पारडसिंगा", defaultGats: ["321", "322"] }
            ]
          },
          {
            id: "RAMTEK",
            name: "Ramtek",
            nameMr: "रामटेक",
            villages: [
              { name: "Mansar", nameMr: "मनसर", defaultGats: ["131", "132"] },
              { name: "Nagardhan", nameMr: "नगरधन", defaultGats: ["231", "232"] },
              { name: "Deolapar", nameMr: "देवळापार", defaultGats: ["331", "332"] }
            ]
          },
          {
            id: "HINGNA",
            name: "Hingna",
            nameMr: "हिंगणा",
            villages: [
              { name: "Wanadongri", nameMr: "वानाडोंगरी", defaultGats: ["141", "142"] },
              { name: "Raipur", nameMr: "रायपूर", defaultGats: ["241", "242"] },
              { name: "Takalghat", nameMr: "टाकळघाट", defaultGats: ["341", "342"] },
              { name: "Kanholibara", nameMr: "कान्होलीबारा", defaultGats: ["441", "442"] }
            ]
          },
          {
            id: "UMRED",
            name: "Umred",
            nameMr: "उमरेड",
            villages: [
              { name: "Sirsi", nameMr: "शिरसी", defaultGats: ["151", "152"] },
              { name: "Bela", nameMr: "बेला", defaultGats: ["251", "252"] }
            ]
          }
        ]
      },
      {
        id: "WARDHA_DIST",
        name: "Wardha",
        nameMr: "वर्धा",
        talukas: [
          {
            id: "WARDHA_TALUKA",
            name: "Wardha",
            nameMr: "वर्धा तालुका",
            villages: [
              { name: "Sevagram", nameMr: "सेवाग्राम", defaultGats: ["101", "102"] },
              { name: "Pavnar", nameMr: "पवनार", defaultGats: ["201", "202"] },
              { name: "Sawangi Meghe", nameMr: "सावंगी मेघे", defaultGats: ["301", "302"] },
              { name: "Sindi", nameMr: "सिंदी", defaultGats: ["401", "402"] }
            ]
          },
          {
            id: "HINGANGHAT",
            name: "Hinganghat",
            nameMr: "हिंगणघाट",
            villages: [
              { name: "Wadner", nameMr: "वडनेर", defaultGats: ["111", "112"] },
              { name: "Samudrapur", nameMr: "समुद्रपूर", defaultGats: ["211", "212"] },
              { name: "Pohna", nameMr: "पोहना", defaultGats: ["311", "312"] }
            ]
          },
          {
            id: "ARVI",
            name: "Arvi",
            nameMr: "आर्वी",
            villages: [
              { name: "Talegaon Shyamji", nameMr: "तळेगाव शामजी पंत", defaultGats: ["121", "122"] },
              { name: "Rohana", nameMr: "रोहणा", defaultGats: ["221", "222"] },
              { name: "Kharangana", nameMr: "खरांगणा", defaultGats: ["321", "322"] }
            ]
          },
          {
            id: "DEOLI",
            name: "Deoli",
            nameMr: "देवळी",
            villages: [
              { name: "Pulgaon", nameMr: "पुलगाव", defaultGats: ["131", "132"] },
              { name: "Nachangaon", nameMr: "नाचनगाव", defaultGats: ["231", "232"] },
              { name: "Andori", nameMr: "अंदोरी", defaultGats: ["331", "332"] }
            ]
          }
        ]
      },
      {
        id: "CHANDRAPUR_DIST",
        name: "Chandrapur",
        nameMr: "चंद्रपूर",
        talukas: [
          {
            id: "CHANDRAPUR_TALUKA",
            name: "Chandrapur",
            nameMr: "चंद्रपूर तालुका",
            villages: [
              { name: "Padoli", nameMr: "पडोली", defaultGats: ["101", "102"] },
              { name: "Ghugus", nameMr: "घुग्गुस", defaultGats: ["201", "202"] },
              { name: "Durgapur", nameMr: "दुर्गापूर", defaultGats: ["301", "302"] }
            ]
          },
          {
            id: "WARORA",
            name: "Warora",
            nameMr: "वरोरा",
            villages: [
              { name: "Anandwan", nameMr: "आनंदवण", defaultGats: ["111", "112"] },
              { name: "Majra", nameMr: "माजरा", defaultGats: ["211", "212"] },
              { name: "Shegaon", nameMr: "शेगाव", defaultGats: ["311", "312"] }
            ]
          },
          {
            id: "BHADRAVATI",
            name: "Bhadravati",
            nameMr: "भद्रावती",
            villages: [
              { name: "Majri", nameMr: "माजरी", defaultGats: ["121", "122"] },
              { name: "Chandan Kheda", nameMr: "चंदनखेडा", defaultGats: ["221", "222"] }
            ]
          },
          {
            id: "BALLARPUR",
            name: "Ballarpur",
            nameMr: "बल्लारपूर",
            villages: [
              { name: "Bamni", nameMr: "बामणी", defaultGats: ["131", "132"] },
              { name: "Visapur", nameMr: "विसापूर", defaultGats: ["231", "232"] },
              { name: "Kothari", nameMr: "कोठारी", defaultGats: ["331", "332"] }
            ]
          }
        ]
      },
      {
        id: "BHANDARA_DIST",
        name: "Bhandara",
        nameMr: "भंडारा",
        talukas: [
          {
            id: "BHANDARA_TALUKA",
            name: "Bhandara",
            nameMr: "भंडारा तालुका",
            villages: [
              { name: "Bela", nameMr: "बेला", defaultGats: ["101", "102"] },
              { name: "Shahapur", nameMr: "शहापूर", defaultGats: ["201", "202"] },
              { name: "Kardha", nameMr: "कारधा", defaultGats: ["301", "302"] }
            ]
          },
          {
            id: "TUMSAR",
            name: "Tumsar",
            nameMr: "तुमसर",
            villages: [
              { name: "Sihora", nameMr: "सिहोरा", defaultGats: ["111", "112"] },
              { name: "Mohadi", nameMr: "मोहाडी", defaultGats: ["211", "212"] },
              { name: "Andhalgaon", nameMr: "आंधळगाव", defaultGats: ["311", "312"] }
            ]
          },
          {
            id: "SAKOLI",
            name: "Sakoli",
            nameMr: "साकोली",
            villages: [
              { name: "Sendurwafa", nameMr: "शेंदूरवाफा", defaultGats: ["121", "122"] },
              { name: "Lakhani", nameMr: "लाखणी", defaultGats: ["221", "222"] }
            ]
          }
        ]
      },
      {
        id: "GONDIA_DIST",
        name: "Gondia",
        nameMr: "गोंदिया",
        talukas: [
          {
            id: "GONDIA_TALUKA",
            name: "Gondia",
            nameMr: "गोंदिया तालुका",
            villages: [
              { name: "Kudwa", nameMr: "कुडवा", defaultGats: ["101", "102"] },
              { name: "Katangi", nameMr: "कटंगी", defaultGats: ["201", "202"] },
              { name: "Fulchur", nameMr: "फुलचूर", defaultGats: ["301", "302"] }
            ]
          },
          {
            id: "TIRORA",
            name: "Tirora",
            nameMr: "तिरोडा",
            villages: [
              { name: "Mundikota", nameMr: "मुंडीकोटा", defaultGats: ["111", "112"] },
              { name: "Kachehani", nameMr: "कचेहानी", defaultGats: ["211", "212"] }
            ]
          },
          {
            id: "ARJUNI_MORGAON",
            name: "Arjuni Morgaon",
            nameMr: "अर्जुनी मोरगाव",
            villages: [
              { name: "Navegaon Bandh", nameMr: "नवेगाव बांध", defaultGats: ["121", "122"] },
              { name: "Keshori", nameMr: "केशोरी", defaultGats: ["221", "222"] }
            ]
          }
        ]
      },
      {
        id: "GADCHIROLI_DIST",
        name: "Gadchiroli",
        nameMr: "गडचिरोली",
        talukas: [
          {
            id: "GADCHIROLI_TALUKA",
            name: "Gadchiroli",
            nameMr: "गडचिरोली तालुका",
            villages: [
              { name: "Porla", nameMr: "पोर्ला", defaultGats: ["101", "102"] },
              { name: "Navegaon", nameMr: "नवेगाव", defaultGats: ["201", "202"] }
            ]
          },
          {
            id: "ARMORI",
            name: "Armori",
            nameMr: "आरमोरी",
            villages: [
              { name: "Wadsa (Desaiganj)", nameMr: "वडसा (देसाईगंज)", defaultGats: ["111", "112"] },
              { name: "Vairagad", nameMr: "वैरागड", defaultGats: ["211", "212"] }
            ]
          },
          {
            id: "CHAMORSHI",
            name: "Chamorshi",
            nameMr: "चामोर्शी",
            villages: [
              { name: "Ashti", nameMr: "आष्टी", defaultGats: ["121", "122"] },
              { name: "Ghot", nameMr: "घोट", defaultGats: ["221", "222"] }
            ]
          },
          {
            id: "AHERI",
            name: "Aheri",
            nameMr: "अहेरी",
            villages: [
              { name: "Allapalli", nameMr: "आल्लापल्ली", defaultGats: ["131", "132"] },
              { name: "Bhamragad", nameMr: "भामरागड", defaultGats: ["231", "232"] }
            ]
          }
        ]
      }
    ]
  },
  {
    id: "KONKAN",
    name: "Konkan Division",
    nameMr: "कोकण महसूल विभाग",
    districts: [
      {
        id: "THANE_DIST",
        name: "Thane",
        nameMr: "ठाणे",
        talukas: [
          {
            id: "KALYAN",
            name: "Kalyan",
            nameMr: "कल्याण",
            villages: [
              { name: "Titwala", nameMr: "टिटवाळा", defaultGats: ["101", "102"] },
              { name: "Goveli", nameMr: "गोवेली", defaultGats: ["201", "202"] },
              { name: "Rayte", nameMr: "रायते", defaultGats: ["301", "302"] },
              { name: "Mharal", nameMr: "म्हारळ", defaultGats: ["401", "402"] }
            ]
          },
          {
            id: "BHIWANDI",
            name: "Bhiwandi",
            nameMr: "भिवंडी",
            villages: [
              { name: "Padgha", nameMr: "पडघा", defaultGats: ["111", "112"] },
              { name: "Dugad", nameMr: "दुगाड", defaultGats: ["211", "212"] },
              { name: "Angaon", nameMr: "अनगाव", defaultGats: ["311", "312"] },
              { name: "Kharbao", nameMr: "खारबाव", defaultGats: ["411", "412"] }
            ]
          },
          {
            id: "MURBAD",
            name: "Murbad",
            nameMr: "मुरबाड",
            villages: [
              { name: "Saralgaon", nameMr: "सरळगाव", defaultGats: ["121", "122"] },
              { name: "Shivale", nameMr: "शिवाळे", defaultGats: ["221", "222"] },
              { name: "Tokawade", nameMr: "टोकावडे", defaultGats: ["321", "322"] },
              { name: "Dhasai", nameMr: "धसई", defaultGats: ["421", "422"] }
            ]
          },
          {
            id: "SHAHAPUR",
            name: "Shahapur",
            nameMr: "शहापूर",
            villages: [
              { name: "Asangaon", nameMr: "आसनगाव", defaultGats: ["131", "132"] },
              { name: "Vashind", nameMr: "वाशिंद", defaultGats: ["231", "232"] },
              { name: "Atgaon", nameMr: "आटगाव", defaultGats: ["331", "332"] },
              { name: "Shenva", nameMr: "शेनवे", defaultGats: ["431", "432"] },
              { name: "Kasara", nameMr: "कसारा", defaultGats: ["531", "532"] }
            ]
          }
        ]
      },
      {
        id: "PALGHAR_DIST",
        name: "Palghar",
        nameMr: "पालघर",
        talukas: [
          {
            id: "PALGHAR_TALUKA",
            name: "Palghar",
            nameMr: "पालघर तालुका",
            villages: [
              { name: "Boisar", nameMr: "बोईसर", defaultGats: ["101", "102"] },
              { name: "Manor", nameMr: "मनोर", defaultGats: ["201", "202"] },
              { name: "Saphale", nameMr: "सफाळे", defaultGats: ["301", "302"] },
              { name: "Kelwe", nameMr: "केळवे", defaultGats: ["401", "402"] },
              { name: "Tarapur", nameMr: "तारापूर", defaultGats: ["501", "502"] }
            ]
          },
          {
            id: "DAHANU",
            name: "Dahanu",
            nameMr: "डहाणू",
            villages: [
              { name: "Gholvad", nameMr: "घोलवड", defaultGats: ["111", "112"] },
              { name: "Bordi", nameMr: "बोर्डी", defaultGats: ["211", "212"] },
              { name: "Kasa", nameMr: "कासा", defaultGats: ["311", "312"] },
              { name: "Vangaon", nameMr: "वाणगाव", defaultGats: ["411", "412"] }
            ]
          },
          {
            id: "VADA",
            name: "Vada",
            nameMr: "वाडा",
            villages: [
              { name: "Kudus", nameMr: "कुडूस", defaultGats: ["121", "122"] },
              { name: "Posheri", nameMr: "पोशेरी", defaultGats: ["221", "222"] },
              { name: "Pali", nameMr: "पाली", defaultGats: ["321", "322"] }
            ]
          },
          {
            id: "VASAI",
            name: "Vasai",
            nameMr: "वसई",
            villages: [
              { name: "Virar Rural", nameMr: "विरार ग्रामीण", defaultGats: ["131", "132"] },
              { name: "Arnala", nameMr: "अर्नाळा", defaultGats: ["231", "232"] },
              { name: "Naigaon Rural", nameMr: "नायगाव ग्रामीण", defaultGats: ["331", "332"] }
            ]
          }
        ]
      },
      {
        id: "RAIGAD_DIST",
        name: "Raigad",
        nameMr: "रायगड (अलिबाग)",
        talukas: [
          {
            id: "ALIBAG",
            name: "Alibag",
            nameMr: "अलिबाग",
            villages: [
              { name: "Mandwa", nameMr: "मांडवा", defaultGats: ["101", "102"] },
              { name: "Varsoli", nameMr: "वरसोळी", defaultGats: ["201", "202"] },
              { name: "Kihim", nameMr: "किहीम", defaultGats: ["301", "302"] },
              { name: "Nagaon", nameMr: "नागाव", defaultGats: ["401", "402"] },
              { name: "Poynad", nameMr: "पोयनाड", defaultGats: ["501", "502"] },
              { name: "Revdanda", nameMr: "रेवदंडा", defaultGats: ["601", "602"] }
            ]
          },
          {
            id: "PANVEL",
            name: "Panvel",
            nameMr: "पनवेल",
            villages: [
              { name: "Taloja", nameMr: "तळोजा", defaultGats: ["111", "112"] },
              { name: "Rasayani", nameMr: "रसायनी", defaultGats: ["211", "212"] },
              { name: "Nere", nameMr: "नेरे", defaultGats: ["311", "312"] },
              { name: "Mohopada", nameMr: "मोहोपाडा", defaultGats: ["411", "412"] }
            ]
          },
          {
            id: "KARJAT_RAIGAD",
            name: "Karjat",
            nameMr: "कर्जत",
            villages: [
              { name: "Neral", nameMr: "नेरळ", defaultGats: ["121", "122"] },
              { name: "Vangani", nameMr: "वांगणी", defaultGats: ["221", "222"] },
              { name: "Kashele", nameMr: "कशेळे", defaultGats: ["321", "322"] },
              { name: "Chowk", nameMr: "चौक", defaultGats: ["421", "422"] }
            ]
          },
          {
            id: "PEN",
            name: "Pen",
            nameMr: "पेण",
            villages: [
              { name: "Wadkhal", nameMr: "वडखळ", defaultGats: ["131", "132"] },
              { name: "Dadar", nameMr: "दादर", defaultGats: ["231", "232"] },
              { name: "Kamarli", nameMr: "कामरली", defaultGats: ["331", "332"] }
            ]
          },
          {
            id: "MAHAD",
            name: "Mahad",
            nameMr: "महाड",
            villages: [
              { name: "Birwadi", nameMr: "बिरवाडी", defaultGats: ["141", "142"] },
              { name: "Nate", nameMr: "नाते", defaultGats: ["241", "242"] },
              { name: "Varandh", nameMr: "वरंध", defaultGats: ["341", "342"] }
            ]
          },
          {
            id: "ROHA",
            name: "Roha",
            nameMr: "रोहा",
            villages: [
              { name: "Kolad", nameMr: "कोलाड", defaultGats: ["151", "152"] },
              { name: "Nagothane", nameMr: "नागोठणे", defaultGats: ["251", "252"] },
              { name: "Dhatav", nameMr: "धाटाव", defaultGats: ["351", "352"] }
            ]
          }
        ]
      },
      {
        id: "RATNAGIRI_DIST",
        name: "Ratnagiri",
        nameMr: "रत्नागिरी",
        talukas: [
          {
            id: "RATNAGIRI_TALUKA",
            name: "Ratnagiri",
            nameMr: "रत्नागिरी तालुका",
            villages: [
              { name: "Ganpatipule", nameMr: "गणपतीपुळे", defaultGats: ["101", "102"] },
              { name: "Malgund", nameMr: "मालगुंड", defaultGats: ["201", "202"] },
              { name: "Pawas", nameMr: "पावस", defaultGats: ["301", "302"] },
              { name: "Mirya", nameMr: "मिर्या", defaultGats: ["401", "402"] },
              { name: "Shirgaon", nameMr: "शिरगाव", defaultGats: ["501", "502"] }
            ]
          },
          {
            id: "CHIPLUN",
            name: "Chiplun",
            nameMr: "चिपळूण",
            villages: [
              { name: "Savarde", nameMr: "सावर्डे", defaultGats: ["111", "112"] },
              { name: "Rampur", nameMr: "रामपूर", defaultGats: ["211", "212"] },
              { name: "Dhamanand", nameMr: "धामणंद", defaultGats: ["311", "312"] }
            ]
          },
          {
            id: "DAPOLI",
            name: "Dapoli",
            nameMr: "दापोली",
            villages: [
              { name: "Harnai", nameMr: "हर्णे", defaultGats: ["121", "122"] },
              { name: "Anjarle", nameMr: "आंजर्ले", defaultGats: ["221", "222"] },
              { name: "Karde", nameMr: "कार्दे", defaultGats: ["321", "322"] },
              { name: "Burondi", nameMr: "बुरोंडी", defaultGats: ["421", "422"] }
            ]
          },
          {
            id: "RAJAPUR",
            name: "Rajapur",
            nameMr: "राजापूर",
            villages: [
              { name: "Jaitapur", nameMr: "जैतापूर", defaultGats: ["131", "132"] },
              { name: "Nate", nameMr: "नाते", defaultGats: ["231", "232"] },
              { name: "Oni", nameMr: "ओणी", defaultGats: ["331", "332"] }
            ]
          }
        ]
      },
      {
        id: "SINDHUDURG_DIST",
        name: "Sindhudurg",
        nameMr: "सिंधुदुर्ग",
        talukas: [
          {
            id: "KANKAVLI",
            name: "Kankavli",
            nameMr: "कणकवली",
            villages: [
              { name: "Phonda Ghat", nameMr: "फोंडा घाट", defaultGats: ["101", "102"] },
              { name: "Nandgaon", nameMr: "नांदगाव", defaultGats: ["201", "202"] },
              { name: "Kasarde", nameMr: "कसरडे", defaultGats: ["301", "302"] },
              { name: "Janavali", nameMr: "जानावाळी", defaultGats: ["401", "402"] }
            ]
          },
          {
            id: "SAWANTWADI",
            name: "Sawantwadi",
            nameMr: "सावंतवाडी",
            villages: [
              { name: "Banda", nameMr: "बांदा", defaultGats: ["111", "112"] },
              { name: "Amboli", nameMr: "आंबोली", defaultGats: ["211", "212"] },
              { name: "Madkhol", nameMr: "माडखोल", defaultGats: ["311", "312"] },
              { name: "Danoli", nameMr: "दाणोली", defaultGats: ["411", "412"] }
            ]
          },
          {
            id: "MALVAN",
            name: "Malvan",
            nameMr: "मालवण",
            villages: [
              { name: "Tarkarli", nameMr: "तारकर्ली", defaultGats: ["121", "122"] },
              { name: "Achara", nameMr: "आचरा", defaultGats: ["221", "222"] },
              { name: "Deobag", nameMr: "देवबाग", defaultGats: ["321", "322"] }
            ]
          },
          {
            id: "KUDAL",
            name: "Kudal",
            nameMr: "कुडाळ",
            villages: [
              { name: "Pinguli", nameMr: "पिंगुळी", defaultGats: ["131", "132"] },
              { name: "Zarap", nameMr: "झाराप", defaultGats: ["231", "232"] },
              { name: "Oros", nameMr: "ओरोस", defaultGats: ["331", "332"] }
            ]
          },
          {
            id: "DEVGAD",
            name: "Devgad",
            nameMr: "देवगड",
            villages: [
              { name: "Jamsande", nameMr: "जामसंडे", defaultGats: ["141", "142"] },
              { name: "Mithbav", nameMr: "मिठभाव", defaultGats: ["241", "242"] },
              { name: "Shirgaon", nameMr: "शिरगाव", defaultGats: ["341", "342"] },
              { name: "Padel", nameMr: "पडेल", defaultGats: ["441", "442"] }
            ]
          }
        ]
      }
    ]
  }
];

function getAllVillages() {
  const list = [];
  for (const div of MAHARASHTRA_DIVISIONS) {
    for (const dist of div.districts) {
      for (const tal of dist.talukas) {
        for (const v of tal.villages) {
          list.push({
            name: v.name,
            nameMr: v.nameMr,
            defaultGats: v.defaultGats || ['101', '102', '103', '104', '105', '106'],
            taluka: tal.name,
            talukaMr: tal.nameMr,
            district: dist.name,
            districtMr: dist.nameMr,
            division: div.name,
            divisionMr: div.nameMr
          });
        }
      }
    }
  }
  return list;
}

function getDivisions() {
  return MAHARASHTRA_DIVISIONS.map(d => ({
    id: d.id,
    name: d.name,
    nameMr: d.nameMr
  }));
}

function findDivision(query) {
  if (!query || typeof query !== 'string') return null;
  const q = query.trim().toLowerCase();
  const divisions = getDivisions();

  // Match by 1-based index
  const index = parseInt(q, 10);
  if (!isNaN(index) && index >= 1 && index <= divisions.length) {
    return divisions[index - 1];
  }

  // Match by id or name
  return divisions.find(d =>
    d.id.toLowerCase() === q ||
    d.name.toLowerCase() === q ||
    (d.nameMr && d.nameMr.toLowerCase() === q) ||
    d.name.toLowerCase().includes(q) ||
    (d.nameMr && d.nameMr.includes(q))
  ) || null;
}

function getDistricts(divisionIdOrName) {
  let targetDivs = MAHARASHTRA_DIVISIONS;
  if (divisionIdOrName) {
    const q = String(divisionIdOrName).trim().toLowerCase();
    targetDivs = MAHARASHTRA_DIVISIONS.filter(d =>
      d.id.toLowerCase() === q ||
      d.name.toLowerCase() === q ||
      (d.nameMr && d.nameMr.toLowerCase() === q) ||
      d.name.toLowerCase().includes(q)
    );
  }

  const list = [];
  for (const div of targetDivs) {
    for (const dist of div.districts || []) {
      list.push({
        id: dist.id,
        name: dist.name,
        nameMr: dist.nameMr,
        divisionId: div.id,
        divisionName: div.name
      });
    }
  }
  return list;
}

function findDistrict(query, divisionIdOrName) {
  if (!query || typeof query !== 'string') return null;
  const q = query.trim().toLowerCase();
  const districts = getDistricts(divisionIdOrName);

  // Match by 1-based index
  const index = parseInt(q, 10);
  if (!isNaN(index) && index >= 1 && index <= districts.length) {
    return districts[index - 1];
  }

  return districts.find(d =>
    d.id.toLowerCase() === q ||
    d.name.toLowerCase() === q ||
    (d.nameMr && d.nameMr.toLowerCase() === q) ||
    d.name.toLowerCase().includes(q) ||
    (d.nameMr && d.nameMr.includes(q))
  ) || null;
}

function getTalukas(districtIdOrName) {
  let list = [];
  for (const div of MAHARASHTRA_DIVISIONS) {
    for (const dist of div.districts || []) {
      if (!districtIdOrName ||
          dist.id.toLowerCase() === String(districtIdOrName).toLowerCase() ||
          dist.name.toLowerCase() === String(districtIdOrName).toLowerCase() ||
          (dist.nameMr && dist.nameMr.toLowerCase() === String(districtIdOrName).toLowerCase()) ||
          dist.name.toLowerCase().includes(String(districtIdOrName).toLowerCase())) {
        for (const tal of dist.talukas || []) {
          list.push({
            id: tal.id,
            name: tal.name,
            nameMr: tal.nameMr,
            districtId: dist.id,
            districtName: dist.name,
            districtMr: dist.nameMr,
            villages: tal.villages || []
          });
        }
      }
    }
  }
  return list;
}

function findTaluka(query, districtIdOrName) {
  if (!query || typeof query !== 'string') return null;
  const q = query.trim().toLowerCase();
  const talukas = getTalukas(districtIdOrName);

  // Match by 1-based index
  const index = parseInt(q, 10);
  if (!isNaN(index) && index >= 1 && index <= talukas.length) {
    return talukas[index - 1];
  }

  return talukas.find(t =>
    t.id.toLowerCase() === q ||
    t.name.toLowerCase() === q ||
    (t.nameMr && t.nameMr.toLowerCase() === q) ||
    t.name.toLowerCase().includes(q) ||
    (t.nameMr && t.nameMr.includes(q))
  ) || null;
}

function getVillagesInTaluka(talukaIdOrName) {
  const talukas = getTalukas();
  const taluka = talukas.find(t =>
    t.id.toLowerCase() === String(talukaIdOrName || '').toLowerCase() ||
    t.name.toLowerCase() === String(talukaIdOrName || '').toLowerCase() ||
    (t.nameMr && t.nameMr.toLowerCase() === String(talukaIdOrName || '').toLowerCase()) ||
    t.name.toLowerCase().includes(String(talukaIdOrName || '').toLowerCase())
  );
  return taluka?.villages || [];
}

const FEATURED_VILLAGE_NAMES = [
  'Murshatpur',
  'Pimpalgaon Baswant',
  'Ozar',
  'Saykheda',
  'Lasalgaon',
  'Chandori',
  'Ugav',
  'Ranwad',
  'Vinchur',
  'Shirdi'
];

function getFeaturedVillages() {
  const all = getAllVillages();
  return FEATURED_VILLAGE_NAMES.map(name =>
    all.find(v => v.name.toLowerCase() === name.toLowerCase()) || {
      name,
      nameMr: name,
      defaultGats: ['101', '102', '103', '104', '105', '106']
    }
  );
}

function findVillage(query, talukaIdOrName) {
  if (!query || typeof query !== 'string') return null;
  const q = query.trim().toLowerCase();
  const pool = talukaIdOrName ? getVillagesInTaluka(talukaIdOrName) : getAllVillages();

  // Match by 1-based index if taluka is given
  const index = parseInt(q, 10);
  if (!isNaN(index) && index >= 1 && index <= pool.length) {
    return pool[index - 1];
  }

  // Exact match
  const exact = pool.find(v =>
    v.name.toLowerCase() === q ||
    (v.nameMr && v.nameMr.trim().toLowerCase() === q)
  );
  if (exact) return exact;

  // Substring match
  const sub = pool.find(v =>
    v.name.toLowerCase().includes(q) ||
    (v.nameMr && v.nameMr.includes(q))
  );
  if (sub) return sub;

  // Fallback to all villages if searched globally
  if (talukaIdOrName) {
    return findVillage(query);
  }
  return null;
}

module.exports = {
  MAHARASHTRA_DIVISIONS,
  getAllVillages,
  getFeaturedVillages,
  getDivisions,
  findDivision,
  getDistricts,
  findDistrict,
  getTalukas,
  findTaluka,
  getVillagesInTaluka,
  findVillage,
  FEATURED_VILLAGE_NAMES
};
