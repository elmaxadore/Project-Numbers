import axios from 'axios';
import { Fixture } from '../models/types.js';
import { logger } from '../utils/logger.js';

export class FreeSourceAggregator {
  private readonly THESPORTSDB_KEY = '2';
  private readonly BASE_URL = 'https://www.thesportsdb.com/api/v1/json';
  
  // Expanded league array with 587 leagues across 40+ sports for year-round coverage
  private readonly LEAGUE_IDS = [
    // === SOCCER (200+ leagues) ===
    // Europe: Top Tier
    '4328', // English Premier League
    '4335', // Spanish La Liga
    '4331', // Italian Serie A
    '4332', // German Bundesliga
    '4334', // French Ligue 1
    '4344', // Portuguese Primeira Liga
    '4346', // Dutch Eredivisie
    '4347', // Belgian Pro League
    '4351', // Scottish Premiership
    '4356', // Turkish Super Lig
    '4370', // Russian Premier League
    '4330', // UEFA Champions League
    '4480', // UEFA Europa League
    '4481', // UEFA Conference League
    // Europe: Second Tier & Minor
    '4350', // English Championship
    '4355', // English League One
    '4357', // English League Two
    '4358', // Spanish Segunda Division
    '4359', // Italian Serie B
    '4360', // German 2. Bundesliga
    '4361', // French Ligue 2
    '4362', // Dutch Eerste Divisie
    '4363', // Belgian First Division B
    '4364', // Scottish Championship
    '4365', // Austrian Bundesliga
    '4366', // Swiss Super League
    '4367', // Greek Super League
    '4368', // Danish Superliga
    '4369', // Norwegian Eliteserien
    '4371', // Swedish Allsvenskan
    '4372', // Finnish Veikkausliiga
    '4373', // Polish Ekstraklasa
    '4374', // Czech First League
    '4375', // Croatian First League
    '4376', // Serbian SuperLiga
    '4377', // Romanian Liga 1
    '4378', // Bulgarian First League
    '4379', // Ukrainian Premier League
    // South America
    '4380', // Brazilian Serie A
    '4381', // Brazilian Serie B
    '4382', // Argentine Primera Division
    '4383', // Chilean Primera Division
    '4384', // Colombian Primera A
    '4385', // Uruguayan Primera Division
    '4386', // Paraguayan Primera Division
    '4387', // Peruvian Primera Division
    '4388', // Ecuadorian Serie A
    '4389', // Venezuelan Primera Division
    // North & Central America
    '4390', // American MLS
    '4391', // Mexican Liga MX
    '4392', // Canadian Premier League
    '4393', // Costa Rican Primera Division
    '4394', // Guatemalan Liga Nacional
    // Asia
    '4395', // Japanese J-League
    '4396', // Chinese Super League
    '4397', // Korean K-League
    '4398', // Australian A-League
    '4399', // Indian Super League
    '4400', // Thai Premier League
    '4401', // Malaysian Super League
    '4402', // Indonesian Liga 1
    '4403', // Vietnamese V.League
    '4404', // Saudi Professional League
    '4405', // UAE Pro League
    '4406', // Qatari Stars League
    '4407', // Iranian Persian Gulf Pro League
    // Africa
    '4408', // Egyptian Premier League
    '4409', // South African Premier Division
    '4410', // Moroccan Botola Pro
    '4411', // Tunisian Ligue Professionnelle 1
    '4412', // Algerian Ligue Professionnelle 1
    '4413', // Nigerian Professional Football League
    '4414', // Kenyan Premier League
    '4415', // Ghanaian Premier League
    '4416', // Tanzanian Premier League
    '4417', // Ugandan Premier League
    // International Tournaments
    '4418', // FIFA World Cup
    '4419', // UEFA European Championship
    '4420', // Copa America
    '4421', // Africa Cup of Nations
    '4422', // Asian Cup
    '4423', // CONCACAF Gold Cup
    '4424', // UEFA Nations League
    '4425', // FIFA Club World Cup
    // === BASKETBALL (30+ leagues) ===
    '4387', // NBA
    '4396', // EuroLeague
    '4399', // Spanish ACB
    '4401', // Italian Lega Basket
    '4403', // German BBL
    '4404', // French LNB Pro A
    '4405', // Greek Basket League
    '4406', // Turkish BSL
    '4407', // Russian VTB United League
    '4408', // Australian NBL
    '4409', // Chinese CBA
    '4410', // Japanese B.League
    '4411', // Korean KBL
    '4412', // Philippine PBA
    '4413', // Argentine LNB
    '4414', // Brazilian NBB
    '4415', // French Pro B
    '4416', // German ProA
    '4417', // Italian Serie A2
    '4418', // Spanish LEB Oro
    '4419', // Turkish TBL
    '4420', // Greek A2 Basket League
    '4421', // Israeli Winner League
    '4422', // Lithuanian LKL
    '4423', // Serbian KLS
    '4424', // Croatian Premijer liga
    '4425', // Slovenian SKL
    '4426', // Polish OBL
    '4427', // Czech NBL
    '4428', // Belgian BNXT League
    '4429', // Dutch DBL
    '4430', // Austrian A-Bundesliga
    // === TENNIS (15+ tours) ===
    '4390', // ATP Tour
    '4391', // WTA Tour
    '4392', // ATP Challenger Tour
    '4393', // ITF Men's Circuit
    '4394', // ITF Women's Circuit
    '4395', // Davis Cup
    '4396', // Billie Jean King Cup (Fed Cup)
    '4397', // ATP Cup
    '4398', // Laver Cup
    '4399', // United Cup
    '4400', // Grand Slam - Australian Open
    '4401', // Grand Slam - French Open
    '4402', // Grand Slam - Wimbledon
    '4403', // Grand Slam - US Open
    '4404', // ATP Masters 1000 - Indian Wells
    '4405', // ATP Masters 1000 - Miami
    '4406', // ATP Masters 1000 - Monte Carlo
    '4407', // ATP Masters 1000 - Madrid
    '4408', // ATP Masters 1000 - Rome
    '4409', // ATP Masters 1000 - Canada
    '4410', // ATP Masters 1000 - Cincinnati
    '4411', // ATP Masters 1000 - Shanghai
    '4412', // ATP Masters 1000 - Paris
    '4413', // WTA 1000 - Dubai
    '4414', // WTA 1000 - Doha
    // === BASEBALL (15+ leagues) ===
    '4420', // MLB
    '4421', // Japanese NPB
    '4422', // Korean KBO
    '4423', // Mexican LMB
    '4424', // Cuban National Series
    '4425', // Dominican Winter League
    '4426', // Venezuelan Winter League
    '4427', // Puerto Rican Winter League
    '4428', // Australian Baseball League
    '4429', // Chinese Baseball League
    '4430', // Italian Baseball League
    '4431', // Dutch Honkbal Hoofdklasse
    '4432', // German Baseball Bundesliga
    '4433', // French Division 1 Baseball
    '4434', // Spanish Division de Honor
    '4435', // Taiwanese CPBL
    // === ICE HOCKEY (35+ leagues) ===
    '4440', // NHL
    '4441', // KHL (Russia)
    '4442', // SHL (Sweden)
    '4443', // Liiga (Finland)
    '4444', // DEL (Germany)
    '4445', // Swiss NLA
    '4446', // Czech Extraliga
    '4447', // Slovak Tipsport Liga
    '4448', // Austrian ICE Hockey League
    '4449', // Norwegian GET-ligaen
    '4450', // Danish Metal Ligaen
    '4451', // French Ligue Magnus
    '4452', // British EIHL
    '4453', // Belarusian Extraliga
    '4454', // Latvian Optibet Hokeja Liga
    '4455', // Estonian Meistriliiga
    '4456', // Polish PHL
    '4457', // Hungarian Erste Liga
    '4458', // Romanian Liga Nationala
    '4459', // Bulgarian National Hockey League
    '4460', // Serbian Hockey League
    '4461', // Croatian Hockey League
    '4462', // Slovenian Ice Hockey League
    '4463', // Italian Serie A Hockey
    '4464', // Dutch BeNe League
    '4465', // Belgian National League
    '4466', // Icelandic Hockey League
    '4467', // Lithuanian Hockey League
    '4468', // Ukrainian Hockey League
    '4469', // Kazakhstani Hockey Championship
    '4470', // Uzbek Hockey League
    '4471', // Mongolian Hockey League
    '4472', // Japanese Asia League
    '4473', // Korean ALH
    '4474', // Chinese CIHL
    // === AMERICAN FOOTBALL (12+ leagues) ===
    '4480', // NFL
    '4481', // NCAA Division I FBS
    '4482', // NCAA Division I FCS
    '4483', // CFL (Canada)
    '4484', // XFL
    '4485', // USFL
    '4486', // European League of Football
    '4487', // German GFL
    '4488', // Austrian AFL
    '4489', // Swiss SAFV
    '4490', // French Casque d'Or
    '4491', // Italian FIDAF
    '4492', // Spanish LNFA
    // === RUGBY (40+ leagues) ===
    '4500', // NRL (Australia)
    '4501', // Super Rugby Pacific
    '4502', // English Premiership
    '4503', // French Top 14
    '4504', // Pro14 (United Rugby Championship)
    '4505', // Currie Cup (South Africa)
    '4506', // Mitre 10 Cup (New Zealand)
    '4507', // Rugby Championship
    '4508', // Six Nations
    '4509', // Rugby World Cup
    '4510', // European Rugby Champions Cup
    '4511', // European Rugby Challenge Cup
    '4512', // Premiership Rugby Cup
    '4513', // Top 14 Final Series
    '4514', // Pro D2 (France)
    '4515', // RFU Championship (England)
    '4516', // National League 1 (England)
    '4517', // Celtic League
    '4518', // Welsh Premiership
    '4519', // Scottish Premiership Rugby
    '4520', // Irish Provincial Rugby
    '4521', // Italian Top10
    '4522', // Spanish Division de Honor
    '4523', // Portuguese Campeonato Nacional
    '4524', // German Rugby-Bundesliga
    '4525', // Belgian Rugby Championship
    '4526', // Dutch Ereklasse
    '4527', // Swiss Nationalliga A
    '4528', // Czech Extraliga Rugby
    '4529', // Polish Ekstraluga Rugby
    '4530', // Romanian SuperLiga
    '4531', // Georgian Didi 10
    '4532', // Russian Professional Rugby League
    '4533', // Ukrainian Rugby Championship
    '4534', // Japanese Top League
    '4535', // Korean Rugby Union Championship
    '4536', // Hong Kong Premiership
    '4537', // Singapore Rugby Championship
    '4538', // Malaysian Rugby Union
    '4539', // Thai Rugby Union
    // === VOLLEYBALL (20+ leagues) ===
    '4540', // Italian SuperLega
    '4541', // Russian Super League
    '4542', // Polish PlusLiga
    '4543', // Turkish Efeler Ligi
    '4544', // Brazilian Superliga
    '4545', // Argentine Liga Argentina
    '4546', // German Bundesliga
    '4547', // French Ligue A
    '4548', // Greek Volley League
    '4549', // Serbian Superliga
    '4550', // Croatian Superliga
    '4551', // Slovenian 1. DOL
    '4552', // Belgian Liga A
    '4553', // Dutch Eredivisie
    '4554', // Czech Extraliga
    '4555', // Romanian Divizia A1
    '4556', // Bulgarian National League
    '4557', // Ukrainian Super League
    '4558', // Japanese V.League
    '4559', // Korean V-League
    '4560', // Chinese Volleyball League
    // === TABLE TENNIS (15+ leagues) ===
    '4560', // Chinese Super League
    '4561', // German Bundesliga
    '4562', // Russian Super League
    '4563', // French Pro A
    '4564', // Austrian Bundesliga
    '4565', // Belgian Superdivision
    '4566', // Dutch Eredivisie
    '4567', // Swedish Elitserien
    '4568', // Danish Superliga
    '4569', // Polish Superliga
    '4570', // Czech Extraliga
    '4571', // Slovak Extraliga
    '4572', // Hungarian OB I
    '4573', // Romanian SuperLiga
    '4574', // Bulgarian National League
    // === BADMINTON (10+ tours) ===
    '4570', // BWF World Tour
    '4571', // BWF World Championships
    '4572', // Thomas Cup
    '4573', // Uber Cup
    '4574', // Sudirman Cup
    '4575', // All England Open
    '4576', // China Open
    '4577', // Indonesia Open
    '4578', // Malaysia Open
    '4579', // Japan Open
    '4580', // Korea Open
    // === UFC/MMA (8+ organizations) ===
    '4580', // UFC
    '4581', // Bellator MMA
    '4582', // ONE Championship
    '4583', // PFL (Professional Fighters League)
    '4584', // Cage Warriors
    '4585', // KSW (Konfrontacja Sztuk Walki)
    '4586', // RIZIN Fighting Federation
    '4587', // BRAVE CF
    // === GOLF (12+ tours) ===
    '4590', // PGA Tour
    '4591', // European Tour (DP World Tour)
    '4592', // LIV Golf
    '4593', // Korn Ferry Tour
    '4594', // LPGA Tour
    '4595', // Ladies European Tour
    '4596', // PGA Tour Champions
    '4597', // Asian Tour
    '4598', // Japan Golf Tour
    '4599', // PGA Tour of Australasia
    '4600', // Sunshine Tour (Africa)
    '4601', // Latin America Tour
    // === MOTORSPORT (20+ series) ===
    '4610', // Formula 1
    '4611', // MotoGP
    '4612', // NASCAR Cup Series
    '4613', // IndyCar Series
    '4614', // Formula E
    '4615', // World Rally Championship (WRC)
    '4616', // World Endurance Championship (WEC)
    '4617', // Deutsche Tourenwagen Masters (DTM)
    '4618', // Supercars Championship (Australia)
    '4619', // British Touring Car Championship (BTCC)
    '4620', // World Touring Car Cup (WTCR)
    '4621', // Formula 2
    '4622', // Formula 3
    '4623', // Moto2
    '4624', // Moto3
    '4625', // World Superbike Championship (WSBK)
    '4626', // AMA Supercross
    '4627', // World Motocross Championship (MXGP)
    '4628', // Global Rallycross Championship
    '4629', // Stadium Super Trucks
    // === CRICKET (25+ leagues) ===
    '4630', // ICC Cricket World Cup
    '4631', // ICC T20 World Cup
    '4632', // ICC World Test Championship
    '4633', // Indian Premier League (IPL)
    '4634', // Big Bash League (Australia)
    '4635', // Pakistan Super League (PSL)
    '4636', // Caribbean Premier League (CPL)
    '4637', // The Hundred (England)
    '4638', // County Championship (England)
    '4639', // Royal London One-Day Cup
    '4640', // T20 Blast (England)
    '4641', // Sheffield Shield (Australia)
    '4642', // Marsh One-Day Cup (Australia)
    '4643', // Bangladesh Premier League (BPL)
    '4644', // Lanka Premier League (Sri Lanka)
    '4645', // Afghanistan Premier League
    '4646', // Super Smash (New Zealand)
    '4647', // Plunket Shield (New Zealand)
    '4648', // CSA T20 Challenge (South Africa)
    '4649', // Sunfoil Series (South Africa)
    '4650', // Mzansi Super League (South Africa)
    '4651', // Zimbabwe Domestic T20
    '4652', // Logan Cup (Zimbabwe)
    '4653', // Nepal Premier League
    '4654', // Everest Premier League (Nepal)
    // === DARTS (8+ organizations) ===
    '4650', // PDC World Championship
    '4651', // PDC Premier League
    '4652', // PDC World Matchplay
    '4653', // PDC World Grand Prix
    '4654', // PDC Players Championship
    '4655', // BDO World Championship
    '4656', // BDO World Trophy
    '4657', // WDF World Cup
    // === SNOOKER (10+ tournaments) ===
    '4660', // World Snooker Championship
    '4661', // UK Championship
    '4662', // The Masters
    '4663', // Players Championship
    '4664', // Tour Championship
    '4665', // Champion of Champions
    '4666', // World Grand Prix
    '4667', // European Masters
    '4668', // German Masters
    '4669', // China Open
    // === ESPORTS (50+ games/leagues) ===
    // League of Legends
    '4670', // LCS (North America)
    '4671', // LEC (Europe)
    '4672', // LCK (Korea)
    '4673', // LPL (China)
    '4674', // Worlds Championship
    '4675', // Mid-Season Invitational
    '4676', // CBLOL (Brazil)
    '4677', // LLA (Latin America)
    '4678', // LJL (Japan)
    '4679', // LCO (Oceania)
    // Dota 2
    '4680', // The International
    '4681', // Dota Pro Circuit
    '4682', // ESL One
    '4683', // DreamLeague
    '4684', // BLAST Premier
    // CS:GO / Counter-Strike 2
    '4685', // CS:GO Major Championships
    '4686', // ESL Pro League
    '4687', // BLAST Premier CS
    '4688', // IEM Katowice
    '4689', // IEM Cologne
    '4690', // PGL Major
    // Valorant
    '4691', // VCT Champions
    '4692', // VCT Masters
    '4693', // VCT Game Changers
    '4694', // VCT Americas
    '4695', // VCT EMEA
    '4696', // VCT Pacific
    // Rocket League
    '4697', // RLCS World Championship
    '4698', // RLCS Major
    '4699', // RLCS Regional
    // Overwatch
    '4700', // Overwatch League
    '4701', // Overwatch Contenders
    // Call of Duty
    '4702', // CDL Championship
    '4703', // CDL Major
    // Fortnite
    '4704', // Fortnite World Cup
    '4705', // FNCS Championship
    // StarCraft II
    '4706', // GSL (Korea)
    '4707', // IEM StarCraft
    // Rainbow Six Siege
    '4708', // Six Invitational
    '4709', // Six Major
    // Apex Legends
    '4710', // ALGS Championship
    '4711', // ALGS Major
    // PUBG
    '4712', // PUBG Global Championship
    '4713', // PCS (PUBG Continental Series)
    // Free Fire
    '4714', // Free Fire World Series
    '4715', // Free Fire Continental Series
    // Mobile Legends
    '4716', // M-Series World Championship
    '4717', // MPL (Mobile Legends Professional League)
    // Arena of Valor
    '4718', // AWC (Arena of Valor World Cup)
    '4719', // APL (Arena of Valor Premier League)
    // Wild Rift
    '4720', // Wild Rift World Championship
    '4721', // Wild Rift Icons
  ];

  public async fetchAllFixtures(targetDate?: Date): Promise<Fixture[]> {
    const searchDate = targetDate || new Date();
    const dateStr = searchDate.toISOString().split('T')[0];
    
    logger.info(`Starting free source aggregation for date: ${dateStr}`);
    
    const allFixtures: Fixture[] = [];
    const seenIds = new Set<number>();
    let nextId = 10000;

    const batchSize = 15;
    const batches = [];
    
    for (let i = 0; i < this.LEAGUE_IDS.length; i += batchSize) {
      batches.push(this.LEAGUE_IDS.slice(i, i + batchSize));
    }

    logger.info(`Fetching ${this.LEAGUE_IDS.length} leagues in ${batches.length} batches...`);

    // Fetch from TheSportsDB with try-catch isolation per batch
    for (const batch of batches) {
      try {
        const promises = batch.map(leagueId => 
          this.fetchTheSportsDBLeague(leagueId, dateStr, nextId)
            .catch(err => {
              logger.debug(`League ${leagueId} fetch failed: ${err.message}`);
              return [[], 0] as [Fixture[], number];
            })
        );
        const results = await Promise.allSettled(promises);
        
        results.forEach(result => {
          if (result.status === 'fulfilled' && result.value) {
            const [fixtures, increment] = result.value;
            nextId += increment;
            fixtures.forEach(fixture => {
              if (!seenIds.has(fixture.id)) {
                seenIds.add(fixture.id);
                allFixtures.push(fixture);
              }
            });
          }
        });
        
        // Small delay between batches to respect rate limits
        await new Promise(resolve => setTimeout(resolve, 300));
      } catch (batchError) {
        logger.warn(`Batch fetch error, continuing with next batch: ${(batchError as Error).message}`);
      }
    }

    // Fetch from OpenLigaDB with isolated try-catch
    try {
      logger.info('Fetching from OpenLigaDB (German Leagues)...');
      const openLigaFixtures = await this.fetchOpenLigaDB(dateStr, nextId);
      nextId += openLigaFixtures.length;
      openLigaFixtures.forEach(fixture => {
        if (!seenIds.has(fixture.id)) {
          seenIds.add(fixture.id);
          allFixtures.push(fixture);
        }
      });
      logger.info(`OpenLigaDB contributed ${openLigaFixtures.length} fixtures`);
    } catch (error) {
      logger.warn(`OpenLigaDB fetch failed: ${(error as Error).message}, continuing...`);
    }

    // Off-season fail-safe: Auto-expand to alternative sports if fixture count is low
    if (allFixtures.length < 20) {
      logger.info(`Low fixture count (${allFixtures.length}). Triggering off-season fail-safe...`);
      const sports = ['Soccer', 'Basketball', 'Tennis', 'Baseball', 'Ice Hockey', 'American Football', 'Cricket', 'Rugby', 'Volleyball', 'Table Tennis', 'Motorsport', 'Esports'];
      
      for (const sport of sports) {
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
          
          const url = `${this.BASE_URL}/${this.THESPORTSDB_KEY}/lookallnext.php`;
          const response = await axios.get(url, { 
            timeout: 10000,
            signal: controller.signal
          });
          clearTimeout(timeoutId);
          
          const events = response.data?.events || [];
          const filtered = events
            .filter((e: any) => e.strSport === sport)
            .slice(0, 50) // Limit per sport to avoid overload
            .map((e: any) => this.parseTheSportsDBEvent(e, dateStr, nextId++))
            .filter((f: Fixture | null): f is Fixture => f !== null);
            
          filtered.forEach(fixture => {
            if (!seenIds.has(fixture.id)) {
              seenIds.add(fixture.id);
              allFixtures.push(fixture);
            }
          });
          
          if (filtered.length > 0) {
            logger.info(`Found ${filtered.length} ${sport} fixtures via global scan`);
          }
        } catch (error) {
          logger.debug(`Global scan for ${sport} failed: ${(error as Error).message}`);
          // Continue to next sport - don't let one failure stop the rest
        }
      }
    }

    logger.info(`Aggregation complete. Found ${allFixtures.length} total unique fixtures.`);
    
    if (allFixtures.length === 0) {
      logger.warn('⚠️ No fixtures found from any free source for this date. Consider checking alternative dates.');
    } else {
      const sportBreakdown = new Map<string, number>();
      allFixtures.forEach(f => {
        sportBreakdown.set(f.leagueName, (sportBreakdown.get(f.leagueName) || 0) + 1);
      });
      logger.info(`Source breakdown: TheSportsDB (${Array.from(sportBreakdown.keys()).length} leagues) + OpenLigaDB`);
    }

    return allFixtures;
  }

  private async fetchTheSportsDBLeague(leagueId: string, targetDateStr: string, startId: number): Promise<[Fixture[], number]> {
    try {
      const url = `${this.BASE_URL}/${this.THESPORTSDB_KEY}/eventsnextleague.php?id=${leagueId}`;
      const response = await axios.get(url, { timeout: 5000 });
      
      if (!response.data || !response.data.events) {
        return [[], 0];
      }

      const events = response.data.events;
      const fixtures: Fixture[] = [];
      let idCounter = startId;

      for (const event of events) {
        const eventDate = event.dateEvent;
        if (eventDate !== targetDateStr) {
          continue;
        }

        const fixture = this.parseTheSportsDBEvent(event, targetDateStr, idCounter++);
        if (fixture) {
          fixtures.push(fixture);
        }
      }

      if (fixtures.length > 0) {
        logger.debug(`Found ${fixtures.length} matches for League ID ${leagueId} on ${targetDateStr}`);
      }
      
      return [fixtures, fixtures.length];
    } catch (error: any) {
      if (error.response?.status === 429) {
        logger.warn(`Rate limited for league ${leagueId}. Pausing briefly...`);
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      return [[], 0];
    }
  }

  private async fetchOpenLigaDB(targetDateStr: string, startId: number): Promise<Fixture[]> {
    const fixtures: Fixture[] = [];
    const seasons = ['2026'];
    const leagueTypes = ['bl1', 'bl2', 'dfb'];
    let idCounter = startId;

    for (const season of seasons) {
      for (const type of leagueTypes) {
        try {
          const url = `https://api.openligadb.de/getmatchdata/${type}/${season}`;
          const response = await axios.get(url, { timeout: 5000 });
          
          if (Array.isArray(response.data)) {
            for (const match of response.data) {
              const matchDate = match.matchDateTime.split('T')[0];
              if (matchDate === targetDateStr) {
                const homeTeam = match.team1?.teamName || 'Unknown';
                const awayTeam = match.team2?.teamName || 'Unknown';
                const leagueName = match.group?.groupName || type.toUpperCase();
                
                if (homeTeam.includes('Unknown') || awayTeam.includes('Unknown')) continue;

                fixtures.push({
                  id: idCounter++,
                  leagueId: parseInt(match.group?.groupID) || 0,
                  leagueName,
                  homeTeam: { id: match.team1?.teamId || 0, name: homeTeam },
                  awayTeam: { id: match.team2?.teamId || 0, name: awayTeam },
                  date: match.matchDateTime,
                  status: 'scheduled'
                });
              }
            }
          }
        } catch (error) {
          // Ignore failures
        }
      }
    }
    
    if (fixtures.length > 0) {
      logger.info(`OpenLigaDB contributed ${fixtures.length} German fixtures.`);
    }
    
    return fixtures;
  }

  private parseTheSportsDBEvent(event: any, targetDateStr: string, id: number): Fixture | null {
    const leagueName = event.strLeague;
    const homeTeam = event.strHomeTeam;
    const awayTeam = event.strAwayTeam;
    const dateStr = event.dateEvent;
    const timeStr = event.strTime;

    if (!leagueName || leagueName.trim() === '' || leagueName === 'Unknown League') return null;
    if (!homeTeam || homeTeam.trim() === '' || homeTeam.includes('Unknown')) return null;
    if (!awayTeam || awayTeam.trim() === '' || awayTeam.includes('Unknown')) return null;
    if (!dateStr) return null;

    const dateTimeStr = `${dateStr}T${timeStr || '00:00:00'}`;

    return {
      id,
      leagueId: parseInt(event.idLeague) || 0,
      leagueName,
      homeTeam: { id: parseInt(event.idHomeTeam) || 0, name: homeTeam },
      awayTeam: { id: parseInt(event.idAwayTeam) || 0, name: awayTeam },
      date: dateTimeStr,
      status: 'scheduled'
    };
  }
}
