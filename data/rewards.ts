export interface ImageConfig {
  url: string;
  caption: string;
}

// სუპერ გამარჯვებულის გიფები (გამოჩნდება ყოველ მე-3 მოგებულ ბლოკზე)
export const SUPER_WINNER_GIFS: ImageConfig[] = [
  {
    url: "https://drive.google.com/file/d/1Dp9FZeA9cAzUzEP8nO-nBp-jOYgJOdeX/view?usp=sharing", // tiger
    caption: "ბრავისიმოოო!!!"
  },
  {
    url: "https://drive.google.com/file/d/1lo4jEZ5Cz6WMOl9ZCUNuELaoWnjtYRML/view?usp=sharing", // soldiers
    caption: "ბრავისიმოოო!!!"
  },
  {
    url: "https://drive.google.com/file/d/1PEsKskC5sP_ZncfDNZAOtf0tmqcggddp/view?usp=sharing", // polo
    caption: "ბრავისიმოოო!!!"
  },
  {
    url: "https://drive.google.com/file/d/1xxvpG-FYy4M98dIuIJQqxsn6QFqfJbL2/view?usp=sharing", // goal
    caption: "ბრავისიმოოო!!!"
  },
  {
    url: "https://drive.google.com/file/d/1xoubVinL5ZPBjCZl4S5jYAqaYPBxeeE8/view?usp=sharing", // zeus
    caption: "ბრავისიმოოო!!!"
  },
  {
    url: "https://drive.google.com/file/d/1EcAkQLz4livegrKqcESsvJada5T6gYW5/view?usp=sharing", // juggle
    caption: "ბრავისიმოოო!!!"
  },
];

// გამარჯვებულის სურათები და ტექსტები
export const WINNER_IMAGES: ImageConfig[] = [
  { 
    url: "https://drive.google.com/file/d/1wuXKSsGy0YgLtw_oElyzRUYWs60h66ct/view?usp=sharing", 
    caption: "მათემატიკის ნამდვილი მეფე ხარ" // king
  },
  { 
    url: "https://drive.google.com/file/d/1GmKTOLfDKndVKGOlcSc9R9bIkSMxtEsJ/view?usp=sharing", 
    caption: "მათემატიკის სუპერმენი ხარ" // superman
  },
  { 
    url: "https://drive.google.com/file/d/1SAng62kOsbQ8HM984tT0E6lZwcmWdJeT/view?usp=sharing", 
    caption: "შენ თომა კვარაცხელია ხარ თუ ხვიჩა მურალაშვილი?" // psg
  },
  { 
    url: "https://drive.google.com/file/d/1XO7mk8d2WywFRdk9L6QK7gG7NPIOM_5F/view?usp=sharing", 
    caption: "შენ ყოფილხარ მათემატიკის რაინდი" // knight
  },
  { 
    url: "https://drive.google.com/file/d/1ZXqSW6eUqqO4bKusOmHFgrBJsKkdYFjY/view?usp=sharing", 
    caption: "მათემატიკტყაოსანი ხარ" // tiger
  },
  { 
    url: "https://drive.google.com/file/d/11rUHbjmmeHhEUKqAPSgkUwjTRDZpjTzs/view?usp=sharing", 
    caption: "ნამდვილი ჯარისკაცი ხარ. ლეიტენანტი ბახტა შენით ამაყობს" // soldier
  },
  { 
    url: "https://drive.google.com/file/d/1dOFwv6Mfx_7OkqkzJf2RnsUc46kltmAe/view?usp=sharing", 
    caption: "ყოჩაღ, პროფესორო თომა" // professor
  },
  { 
    url: "https://drive.google.com/file/d/1MWiGBhZqQSiCwfKpo6IB3p_7e7YQaIWB/view?usp=sharing", 
    caption: "უძლიერესი ხარ" // strong
  },
  { 
    url: "https://drive.google.com/file/d/1JQNqDpspGagpwNP02GpJY6IsRGGNyb-b/view?usp=sharing", 
    caption: "მათემატიკის ბეტმენი ხარ" // batman
  },
  { 
    url: "https://drive.google.com/file/d/1iDtpwiLh_F-VpgQLo21LWFxwIwviefk1/view?usp=sharing", 
    caption: "მათემატიკის დეტექტივი" // zootopia
  },
  { 
    url: "https://drive.google.com/file/d/1JVHpVp8iaB1Mj-naheUfesmfHsVhrgyh/view?usp=sharing", 
    caption: "ნუ თომა, ნუ პაგაძი" // nupagadi
  },  
  { 
    url: "https://drive.google.com/file/d/1OiizhAU7IJ2ZsUECfthoycFbdppt-gW6/view?usp=sharing", 
    caption: "მათემატიკის ზევსი" // zeus
  },
  { 
    url: "https://drive.google.com/file/d/1kluZR-WRbdrXGOzYOJR9i7dZUq6xWWf-/view?usp=sharing", 
    caption: "მათემატიკის პრეზიდენტი ხარ" // president
  },
  { 
    url: "https://drive.google.com/file/d/1k2tpbvOBiS1ADxB_xsbk2CK9UcMPYL7m/view?usp=sharing", 
    caption: "სპაიდერმენ, სპაიდერმეეენ!!!" // president
  },
];

// დამარცხებულის სურათები და ტექსტები
export const LOSER_IMAGES: ImageConfig[] = [
  { 
    url: "https://drive.google.com/file/d/1ZSrOpoyQqp13MQ4RAQPeYxNdbAJglb1I/view?usp=sharing", 
    caption: "ყველა ვერ გამოიცანი, კლოუნი ყოფილხარ" // clown
  },
  { 
    url: "https://drive.google.com/file/d/11VR2sOq3KNw9l2WAr5UtH97eL7YGaTmk/view?usp=sharing", 
    caption: "მათემატიკოსი კი არა უბრალოდ მსუქანა ხარ" // fat
  },
  { 
    url: "https://drive.google.com/file/d/1Hn3RgRadJxLLNGbtnYe7Oh-9Ystvf-tg/view?usp=sharing", 
    caption: "შენ ხარ მათემატიკური მაიმუნი" // monkey
  },
  { 
    url: "https://drive.google.com/file/d/1SwDkzkYocvgCy1x0iOE0SBRhHDpoOYN6/view?usp=sharing", 
    caption: "მათემატიკოსი კი არა უკბილო ბებრუხანა ხარ" // old
  }, 
  { 
    url: "https://drive.google.com/file/d/1x1ajsCEDGTdu7ZFM-3uXHv4BXWNjYX8U/view?usp=sharing", 
    caption: "მათემატიკოსი კი არა ღორის გრიპი ხარ" // ill
  },
  { 
    url: "https://drive.google.com/file/d/1advIeiLRl-4HShkIh13SVhUP_uAG6L3G/view?usp=sharing", 
    caption: "ვის აუცურდა ფეხი ბანანის ქერქზე?" // banana
  },
  { 
    url: "https://drive.google.com/file/d/137ecw5X7XBn3fsTw6oplzVBX-cKlOlsS/view?usp=sharing", 
    caption: "ხო ხედავ ამდენი თამაშისგან თავი ტელეფონად გადაგექცა" // phone
  },
  { 
    url: "https://drive.google.com/file/d/1irvOffR2cR3L6Kj_qO9TGCto_1eRUhFo/view?usp=sharing", 
    caption: "თომთემატიკას თუ არ ისწავლი ასეთი გახდები" // homeless
  },
];
