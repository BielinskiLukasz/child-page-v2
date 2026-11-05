export type CategoryId =
  | 'wszystkie'
  | 'przyroda'
  | 'zwierzeta'
  | 'pojazdy'
  | 'kreatywne'
  | 'nauka'
  | 'zabawa';

export type ActivityCategory = Exclude<CategoryId, 'wszystkie'>;

export interface Activity {
  id: string;
  name: string;
  emoji: string;
  category: ActivityCategory;
  description: string;
}

export const CATEGORIES: { id: CategoryId; label: string; emoji: string }[] = [
  { id: 'wszystkie', label: 'Wszystkie', emoji: '🌈' },
  { id: 'przyroda', label: 'Przyroda', emoji: '🌿' },
  { id: 'zwierzeta', label: 'Zwierzątka', emoji: '🐾' },
  { id: 'pojazdy', label: 'Pojazdy', emoji: '🚂' },
  { id: 'kreatywne', label: 'Kreatywne', emoji: '🎨' },
  { id: 'nauka', label: 'Uczę się', emoji: '🔤' },
  { id: 'zabawa', label: 'Dla zabawy', emoji: '🎠' },
];

export const CATEGORY_STYLES: Record<
  ActivityCategory,
  { label: string; tile: string; pill: string; dot: string }
> = {
  przyroda: {
    label: 'Przyroda',
    tile: 'bg-[#e6f4e4]',
    pill: 'bg-[#edf7eb] text-[#4f7d4a]',
    dot: 'bg-[#8ecc86]',
  },
  zwierzeta: {
    label: 'Zwierzątka',
    tile: 'bg-[#fdf0da]',
    pill: 'bg-[#fdf3e3] text-[#9a6b2f]',
    dot: 'bg-[#efc47e]',
  },
  pojazdy: {
    label: 'Pojazdy',
    tile: 'bg-[#e3f0fb]',
    pill: 'bg-[#e9f3fc] text-[#3d6f95]',
    dot: 'bg-[#8ec5e8]',
  },
  kreatywne: {
    label: 'Kreatywne',
    tile: 'bg-[#fde8ee]',
    pill: 'bg-[#fdeef2] text-[#a05070]',
    dot: 'bg-[#f2a9c0]',
  },
  nauka: {
    label: 'Uczę się',
    tile: 'bg-[#eee8fb]',
    pill: 'bg-[#f2edfc] text-[#6651a3]',
    dot: 'bg-[#b7a4e8]',
  },
  zabawa: {
    label: 'Dla zabawy',
    tile: 'bg-[#fdeade]',
    pill: 'bg-[#fdf0e7] text-[#a86232]',
    dot: 'bg-[#f5b489]',
  },
};

export const ACTIVITIES: Activity[] = [
  { id: 'akwarium', name: 'Akwarium Artura', emoji: '🐠', category: 'przyroda', description: 'Karm rybki i patrz, jak unoszą się spokojne bąbelki.' },
  { id: 'ogrod', name: 'Magiczny Ogród', emoji: '🌷', category: 'przyroda', description: 'Dotknij łąki, by wyrosły kwiaty i małe grzybki.' },
  { id: 'niebo', name: 'Nocne Niebo', emoji: '⭐', category: 'przyroda', description: 'Połącz świecące gwiazdy w proste, miłe obrazki.' },
  { id: 'dzien-i-noc', name: 'Dzień i Noc', emoji: '🌗', category: 'przyroda', description: 'Przełącz słońce i księżyc, zajrzyj do chmur i ptaków.' },
  { id: 'motyle', name: 'Ogród Motyli', emoji: '🦋', category: 'przyroda', description: 'Dotknij kwiatu, a motyl powoli do niego podleci.' },
  { id: 'malowanie', name: 'Malowanie Światłem', emoji: '🖍️', category: 'kreatywne', description: 'Rysuj palcem miękkie, świecące ślady, które gasną.' },
  { id: 'pociag', name: 'Mały Pociąg', emoji: '🚂', category: 'pojazdy', description: 'Pociągnij za dźwignię i zabierz zwierzątka na przejażdżkę.' },
  { id: 'banki', name: 'Bańki Mydlane', emoji: '🫧', category: 'zabawa', description: 'Dmuchaj bańki, które unoszą się i pękają po dotknięciu.' },
  { id: 'dobranoc', name: 'Dobranoc', emoji: '🌙', category: 'zwierzeta', description: 'Zgaś światełka w domku i ułóż zwierzątka do snu.' },
  { id: 'deszczyk', name: 'Deszczyk i Tęcza', emoji: '🌈', category: 'przyroda', description: 'Dotknij chmur, by spadł delikatny deszcz i pojawiła się tęcza.' },
  { id: 'ksztalty', name: 'Kolorowe Kształty', emoji: '🔷', category: 'nauka', description: 'Przeciągnij miękkie kształty na ich miejsca.' },
  { id: 'farma', name: 'Zwierzątka na Farmie', emoji: '🐄', category: 'zwierzeta', description: 'Dotknij zwierząt i zajrzyj, kto chowa się w stodole.' },
  { id: 'policz-razem', name: 'Policz Razem', emoji: '🔢', category: 'nauka', description: 'Dotykaj przedmiotów jeden po drugim i licz razem z nimi.' },
  { id: 'ubierz-misia', name: 'Ubierz Misia', emoji: '🧸', category: 'zwierzeta', description: 'Ubierz misia w ubranka pasujące do pogody za oknem.' },
  { id: 'przeciwienstwa', name: 'Przeciwieństwa', emoji: '🔁', category: 'nauka', description: 'Dotknij obrazka i zobacz, jak zmienia się w przeciwieństwo.' },
  { id: 'co-nie-pasuje', name: 'Co nie Pasuje?', emoji: '🧐', category: 'nauka', description: 'Znajdź jeden obrazek, który różni się od pozostałych.' },
  { id: 'literki', name: 'Literki', emoji: '🔤', category: 'nauka', description: 'Duża literka i obrazek słowa, które się od niej zaczyna.' },
  { id: 'sciezka', name: 'Ścieżka', emoji: '🛤️', category: 'nauka', description: 'Przesuń palcem po krętej ścieżce, a ludzik dojdzie do celu.' },
  { id: 'wzorki', name: 'Wzorki', emoji: '🧵', category: 'nauka', description: 'Wybierz koralik, który pięknie przedłuży wzór.' },
  { id: 'chowany', name: 'Zabawa w chowanego', emoji: '🫣', category: 'zabawa', description: 'Unieś listki i znajdź ukryte zwierzątka i kwiatki.' },
  { id: 'koraliki', name: 'Koraliki', emoji: '📿', category: 'kreatywne', description: 'Nawlekaj pastelowe koraliki na sznurek i stwórz naszyjnik.' },
  { id: 'duze-i-male', name: 'Duże i Małe', emoji: '🐘', category: 'nauka', description: 'Dopasuj małe i duże zwierzątka do odpowiednich domków.' },
  { id: 'kubeczki', name: 'Kolorowe Kubeczki', emoji: '🥤', category: 'nauka', description: 'Wrzuć piłeczkę do kubeczka w tym samym kolorze.' },
  { id: 'puzzle', name: 'Puzzle', emoji: '🧩', category: 'nauka', description: 'Wsuń duże kawałki obrazka na swoje miejsca.' },
  { id: 'wieza', name: 'Wieża z Klocków', emoji: '🧱', category: 'kreatywne', description: 'Układaj klocki w wieżę, która nigdy się nie przewraca.' },
  { id: 'myjnia', name: 'Myjnia', emoji: '🚗', category: 'zabawa', description: 'Umyj zabłocony pojazd lub zwierzątko samym palcem.' },
  { id: 'cienie', name: 'Cienie', emoji: '🌓', category: 'zwierzeta', description: 'Dopasuj kolorowe zwierzątka do ich szarych cieni.' },
  { id: 'buzki', name: 'Buźki', emoji: '😊', category: 'zwierzeta', description: 'Dotykaj buzi, by zmieniała spokojne miny.' },
  { id: 'pamiec', name: 'Pamięć', emoji: '🃏', category: 'zabawa', description: 'Odkrywaj karty i szukaj spokojnych par obrazków.' },
  { id: 'pilka', name: 'Gdzie jest Piłka?', emoji: '⚽', category: 'nauka', description: 'Zobacz, czy piłka jest w, na, pod czy obok pudełka.' },
  { id: 'rysuj-ksztalty', name: 'Rysuj Kształty', emoji: '✏️', category: 'kreatywne', description: 'Obrysuj kropkowany kształt palcem.' },
  { id: 'samolot', name: 'Mały Samolot', emoji: '✈️', category: 'pojazdy', description: 'Wystartuj, poleć nad chmurami i delikatnie wyląduj.' },
  { id: 'traktor', name: 'Traktor', emoji: '🚜', category: 'pojazdy', description: 'Jeźdź traktorem po polu i sadź małe roślinki.' },
  { id: 'autobusik', name: 'Autobusik', emoji: '🚌', category: 'pojazdy', description: 'Autobusik jedzie przez wioskę i zabiera zwierzątka.' },
  { id: 'rakieta', name: 'Rakieta', emoji: '🚀', category: 'pojazdy', description: 'Poleć rakietą między gwiazdami i odwiedź planety.' },
  { id: 'lodka', name: 'Mała Łódka', emoji: '⛵', category: 'pojazdy', description: 'Płyń spokojnie po rzece i pomachaj zwierzątkom.' },
  { id: 'podwodna', name: 'Łódź Podwodna', emoji: '🟡', category: 'pojazdy', description: 'Prowadź żółtą łódź podwodną wśród rybek i bąbelków.' },
  { id: 'kolejka', name: 'Kolejka Linowa', emoji: '🚡', category: 'pojazdy', description: 'Przejedź gondolą z doliny na sam szczyt góry.' },
  { id: 'balon', name: 'Balon', emoji: '🎈', category: 'pojazdy', description: 'Unieś kolorowy balon i dotykaj miękkich chmur.' },
  { id: 'karuzela', name: 'Karuzela', emoji: '🎠', category: 'zabawa', description: 'Zakręć karuzelą ze skaczącymi zwierzątkami.' },
  { id: 'zjezdzalnia', name: 'Zjeżdżalnia', emoji: '🛝', category: 'zabawa', description: 'Zwierzątka wchodzą po drabince i zjeżdżają w dół.' },
  { id: 'hustawka', name: 'Huśtawka', emoji: '🌳', category: 'zabawa', description: 'Delikatnie bujaj huśtawkę i patrz na spadające liście.' },
  { id: 'latawiec', name: 'Latawiec', emoji: '🪁', category: 'zabawa', description: 'Prowadź latawiec palcem, a wstążka podąży za nim.' },
  { id: 'kukulka', name: 'Zegar z Kukułką', emoji: '🕰️', category: 'zabawa', description: 'Otwórz drzwiczki zegara i poznaj jego małych mieszkańców.' },
  { id: 'wiatraczki', name: 'Wiatraczki', emoji: '🌬️', category: 'zabawa', description: 'Zakręć kolorowymi wiatraczkami jednym ruchem palca.' },
  { id: 'kapiel', name: 'Kąpiel Zwierzątek', emoji: '🛁', category: 'zwierzeta', description: 'Umyj zwierzątko: szoruj, spłucz pianę i wysusz ręcznikiem.' },
  { id: 'rasy', name: 'Rasy Piesków', emoji: '🐕', category: 'zwierzeta', description: 'Poznaj rasy piesków i pogłaszcz każdego z nich.' },
  { id: 'psiamyjnia', name: 'Psia Myjnia', emoji: '🐩', category: 'zwierzeta', description: 'Umyj zabłoconego pieska i poznaj nazwę jego rasy.' },
  { id: 'wyscig', name: 'Wyścig Piesków', emoji: '🏁', category: 'zwierzeta', description: 'Kibicuj pieskom w zgodnym wyścigu, w którym wszyscy wygrywają.' },
  { id: 'aport', name: 'Aport', emoji: '🎾', category: 'zwierzeta', description: 'Rzuć piłkę w parku i patrz, jak piesek ją przynosi.' },
  { id: 'nakarm', name: 'Nakarm Pieska', emoji: '🦴', category: 'zwierzeta', description: 'Wybierz jedzenie, które piesek naprawdę może zjeść.' },
  { id: 'koparka', name: 'Koparka', emoji: '🚧', category: 'pojazdy', description: 'Prowadź koparkę i wsyp piasek do wywrotki.' },
  { id: 'zbuduj', name: 'Zbuduj Rakietę', emoji: '🛠️', category: 'pojazdy', description: 'Złóż rakietę z części i poleć na Księżyc.' },
  { id: 'plac', name: 'Plac Budowy', emoji: '🏗️', category: 'pojazdy', description: 'Buduj mały domek krok po kroku maszynami budowlanymi.' },
  { id: 'zakupy', name: 'Zakupy', emoji: '🛒', category: 'zabawa', description: 'Włóż produkty do koszyka i zeskanuj je na ladzie.' },
  { id: 'smok', name: 'Lot na Smoku', emoji: '🐉', category: 'pojazdy', description: 'Leć przyjaznym smokiem nad krainą i zieje delikatnym ogniem.' },
  { id: 'odjajka', name: 'Od Jajka do…', emoji: '🐣', category: 'przyroda', description: 'Dotykaj obrazka, by zobaczyć kolejne etapy życia zwierzątka.' },
  { id: 'wedkowanie', name: 'Wędkowanie', emoji: '🎣', category: 'przyroda', description: 'Trzymaj palec, by opuścić haczyk i wyciągnąć rybkę.' },
  { id: 'kulkowy', name: 'Kulkowy Tor', emoji: '🔴', category: 'zabawa', description: 'Obróć rampy i doprowadź kulkę do koszyka.' },
  { id: 'lustro', name: 'Lustro', emoji: '🪞', category: 'kreatywne', description: 'Maluj na jednej połowie, a druga odbije każdy ruch.' },
  { id: 'latarka', name: 'Latarka', emoji: '🔦', category: 'zabawa', description: 'Oświetl ciemny pokój i znajdź ukryte zwierzątka.' },
  { id: 'slady', name: 'Ślady na Piasku', emoji: '👣', category: 'przyroda', description: 'Rysuj palcem po piasku i odkrywaj ukryty obrazek.' },
  { id: 'rozmiar', name: 'Rozmiar', emoji: '📏', category: 'nauka', description: 'Ułóż pięć rzeczy od najmniejszej do największej.' },
  { id: 'nalej', name: 'Nalej Wody', emoji: '💧', category: 'nauka', description: 'Przelej wodę z dzbanka do szklanek różnych rozmiarów.' },
  { id: 'naklejki', name: 'Naklejki', emoji: '🌟', category: 'kreatywne', description: 'Naklejaj obrazki w dowolne miejsca na scenie.' },
  { id: 'pizza', name: 'Pizza', emoji: '🍕', category: 'kreatywne', description: 'Zrób pizzę krok po kroku: rozwałkuj, dodaj dodatki, upiecz.' },
  { id: 'mieszanie', name: 'Mieszanie Kolorów', emoji: '🎨', category: 'kreatywne', description: 'Wrzuć farby do garnka i mieszaj, by powstały nowe kolory.' },
  { id: 'mojdzien', name: 'Mój Dzień', emoji: '☀️', category: 'zabawa', description: 'Poznaj dzień zwierzątka: poranek, obiad, zabawa i noc.' },
];

export const FEATURED = ['akwarium', 'pociag', 'puzzle', 'pizza'];
