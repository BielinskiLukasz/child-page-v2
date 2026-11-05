import type { ComponentType } from 'react';
import AkwariumActivity from './AkwariumActivity';
import AportActivity from './AportActivity';
import AutobusikActivity from './AutobusikActivity';
import BalonActivity from './BalonActivity';
import BankiActivity from './BankiActivity';
import BuzkiActivity from './BuzkiActivity';
import ChowanyActivity from './ChowanyActivity';
import CienieActivity from './CienieActivity';
import CoNiePasujeActivity from './CoNiePasujeActivity';
import DeszczykActivity from './DeszczykActivity';
import DobranocActivity from './DobranocActivity';
import DuzeIMaleActivity from './DuzeIMaleActivity';
import DzienINocActivity from './DzienINocActivity';
import FarmaActivity from './FarmaActivity';
import HustawkaActivity from './HustawkaActivity';
import KapielActivity from './KapielActivity';
import KaruzelaActivity from './KaruzelaActivity';
import KolejkaActivity from './KolejkaActivity';
import KoparkaActivity from './KoparkaActivity';
import KoralikiActivity from './KoralikiActivity';
import KsztaltyActivity from './KsztaltyActivity';
import KubeczkiActivity from './KubeczkiActivity';
import KukulkaActivity from './KukulkaActivity';
import KulkowyActivity from './KulkowyActivity';
import LatarkaActivity from './LatarkaActivity';
import LatawiecActivity from './LatawiecActivity';
import LiterkiActivity from './LiterkiActivity';
import LodkaActivity from './LodkaActivity';
import LustroActivity from './LustroActivity';
import MalowanieActivity from './MalowanieActivity';
import MieszanieActivity from './MieszanieActivity';
import MojdzienActivity from './MojdzienActivity';
import MotyleActivity from './MotyleActivity';
import MyjniaActivity from './MyjniaActivity';
import NakarmActivity from './NakarmActivity';
import NaklejkiActivity from './NaklejkiActivity';
import NalejActivity from './NalejActivity';
import NieboActivity from './NieboActivity';
import OdjajkaActivity from './OdjajkaActivity';
import OgrodActivity from './OgrodActivity';
import PamiecActivity from './PamiecActivity';
import PilkaActivity from './PilkaActivity';
import PizzaActivity from './PizzaActivity';
import PlacActivity from './PlacActivity';
import PociagActivity from './PociagActivity';
import PodwodnaActivity from './PodwodnaActivity';
import PoliczRazemActivity from './PoliczRazemActivity';
import PrzeciwienstwaActivity from './PrzeciwienstwaActivity';
import PsiamyjniaActivity from './PsiamyjniaActivity';
import PuzzleActivity from './PuzzleActivity';
import RakietaActivity from './RakietaActivity';
import RasyActivity from './RasyActivity';
import RozmiarActivity from './RozmiarActivity';
import RysujKsztaltyActivity from './RysujKsztaltyActivity';
import SamolotActivity from './SamolotActivity';
import SciezkaActivity from './SciezkaActivity';
import SladyActivity from './SladyActivity';
import SmokActivity from './SmokActivity';
import TraktorActivity from './TraktorActivity';
import UbierzMisiaActivity from './UbierzMisiaActivity';
import WedkowanieActivity from './WedkowanieActivity';
import WiatraczkiActivity from './WiatraczkiActivity';
import WiezaActivity from './WiezaActivity';
import WyscigActivity from './WyscigActivity';
import WzorkiActivity from './WzorkiActivity';
import ZakupyActivity from './ZakupyActivity';
import ZbudujActivity from './ZbudujActivity';
import ZjezdzalniaActivity from './ZjezdzalniaActivity';

export const NATIVE_ACTIVITIES: Record<string, ComponentType> = {
  akwarium: AkwariumActivity,
  ogrod: OgrodActivity,
  niebo: NieboActivity,
  'dzien-i-noc': DzienINocActivity,
  motyle: MotyleActivity,
  malowanie: MalowanieActivity,
  pociag: PociagActivity,
  banki: BankiActivity,
  dobranoc: DobranocActivity,
  deszczyk: DeszczykActivity,
  ksztalty: KsztaltyActivity,
  farma: FarmaActivity,
  'policz-razem': PoliczRazemActivity,
  'ubierz-misia': UbierzMisiaActivity,
  przeciwienstwa: PrzeciwienstwaActivity,
  'co-nie-pasuje': CoNiePasujeActivity,
  literki: LiterkiActivity,
  sciezka: SciezkaActivity,
  wzorki: WzorkiActivity,
  chowany: ChowanyActivity,
  koraliki: KoralikiActivity,
  'duze-i-male': DuzeIMaleActivity,
  kubeczki: KubeczkiActivity,
  puzzle: PuzzleActivity,
  wieza: WiezaActivity,
  myjnia: MyjniaActivity,
  cienie: CienieActivity,
  buzki: BuzkiActivity,
  pamiec: PamiecActivity,
  pilka: PilkaActivity,
  'rysuj-ksztalty': RysujKsztaltyActivity,
  samolot: SamolotActivity,
  traktor: TraktorActivity,
  autobusik: AutobusikActivity,
  rakieta: RakietaActivity,
  lodka: LodkaActivity,
  podwodna: PodwodnaActivity,
  kolejka: KolejkaActivity,
  balon: BalonActivity,
  karuzela: KaruzelaActivity,
  zjezdzalnia: ZjezdzalniaActivity,
  hustawka: HustawkaActivity,
  latawiec: LatawiecActivity,
  kukulka: KukulkaActivity,
  wiatraczki: WiatraczkiActivity,
  kapiel: KapielActivity,
  rasy: RasyActivity,
  psiamyjnia: PsiamyjniaActivity,
  wyscig: WyscigActivity,
  aport: AportActivity,
  nakarm: NakarmActivity,
  koparka: KoparkaActivity,
  zbuduj: ZbudujActivity,
  plac: PlacActivity,
  zakupy: ZakupyActivity,
  smok: SmokActivity,
  odjajka: OdjajkaActivity,
  wedkowanie: WedkowanieActivity,
  kulkowy: KulkowyActivity,
  lustro: LustroActivity,
  latarka: LatarkaActivity,
  slady: SladyActivity,
  rozmiar: RozmiarActivity,
  nalej: NalejActivity,
  naklejki: NaklejkiActivity,
  pizza: PizzaActivity,
  mieszanie: MieszanieActivity,
  mojdzien: MojdzienActivity,
};

export const NATIVE_ACTIVITY_IDS = Object.keys(NATIVE_ACTIVITIES);
export const NATIVE_COUNT = NATIVE_ACTIVITY_IDS.length;

export function isNativeActivity(id?: string): boolean {
  return Boolean(id && Object.prototype.hasOwnProperty.call(NATIVE_ACTIVITIES, id));
}

export function getNativeActivity(id?: string): ComponentType | null {
  if (!id || !isNativeActivity(id)) return null;
  return NATIVE_ACTIVITIES[id];
}
